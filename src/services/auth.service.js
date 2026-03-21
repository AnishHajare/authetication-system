import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import otpModel from "../models/otp.model.js";
import sessionModel from "../models/session.model.js";
import userModel from "../models/user.model.js";
import { sendEmail } from "./email.service.js";
import { generateOtp, getOtpHtml } from "../utils/utils.js";
import AppError from "../utils/app-error.js";
import { logAuthEvent } from "../utils/audit-log.js";

let emailSender = sendEmail;

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function signAccessToken(payload) {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
    jwtid: crypto.randomUUID(),
  });
}

async function createOtpForUser(user) {
  const otp = generateOtp();
  const otpHash = hashValue(otp);
  const expiresAt = new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);

  await otpModel.deleteMany({ userId: user._id });
  await otpModel.create({
    email: user.email,
    userId: user._id,
    otpHash,
    expiresAt,
  });

  return {
    otp,
    html: getOtpHtml(otp),
  };
}

async function sendVerificationEmail(user) {
  const { otp, html } = await createOtpForUser(user);
  await emailSender(
    user.email,
    "OTP Verification",
    `Your OTP code is ${otp}`,
    html,
  );
}

export async function registerUser({ userName, email, password }) {
  const isAlreadyRegistered = await userModel.findOne({
    $or: [{ userName }, { email }],
  });

  if (isAlreadyRegistered) {
    logAuthEvent("register", "rejected", {
      email,
      reason: "duplicate-identity",
    });
    throw new AppError(409, "Unable to register with the provided credentials");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    userName,
    email,
    password: hashedPassword,
  });

  try {
    await sendVerificationEmail(user);
  } catch (error) {
    await otpModel.deleteMany({ userId: user._id });
    await userModel.findByIdAndDelete(user._id);
    logAuthEvent("register", "failed", {
      userId: user._id.toString(),
      email,
      reason: "verification-email-delivery-failed",
    });
    throw new AppError(
      502,
      "Failed to deliver verification email. Registration was rolled back.",
    );
  }

  logAuthEvent("register", "success", {
    userId: user._id.toString(),
    email: user.email,
  });

  return user;
}

export function setEmailSender(sender) {
  emailSender = sender;
}

export function resetEmailSender() {
  emailSender = sendEmail;
}

export async function resendVerificationEmail(email) {
  const user = await userModel.findOne({ email });

  if (!user || user.verified) {
    logAuthEvent("resend-verification-email", "ignored", {
      email,
      reason: !user ? "user-not-found" : "already-verified",
    });
    return false;
  }

  const latestOtp = await otpModel.findOne({ userId: user._id }).sort({
    createdAt: -1,
  });

  if (latestOtp) {
    const nextAllowedAt =
      latestOtp.createdAt.getTime() +
      config.OTP_RESEND_COOLDOWN_SECONDS * 1000;

    if (nextAllowedAt > Date.now()) {
      logAuthEvent("resend-verification-email", "ignored", {
        userId: user._id.toString(),
        email: user.email,
        reason: "cooldown-active",
      });
      return false;
    }
  }

  await sendVerificationEmail(user);
  logAuthEvent("resend-verification-email", "success", {
    userId: user._id.toString(),
    email: user.email,
  });
  return true;
}

export async function loginUser({ email, password, ip, userAgent }) {
  const user = await userModel.findOne({ email });

  if (!user) {
    logAuthEvent("login", "failed", {
      email,
      ip,
      userAgent,
      reason: "invalid-credentials",
    });
    throw new AppError(401, "Invalid email or password");
  }

  if (!user.verified) {
    logAuthEvent("login", "failed", {
      userId: user._id.toString(),
      email: user.email,
      ip,
      userAgent,
      reason: "invalid-credentials",
    });
    throw new AppError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    logAuthEvent("login", "failed", {
      userId: user._id.toString(),
      email: user.email,
      ip,
      userAgent,
      reason: "invalid-credentials",
    });
    throw new AppError(401, "Invalid email or password");
  }

  const refreshToken = signRefreshToken({
    id: user._id,
  });

  const session = await sessionModel.create({
    userId: user._id,
    refreshTokenHash: hashValue(refreshToken),
    ip: ip || "unknown",
    userAgent: userAgent || "unknown",
  });

  const accessToken = signAccessToken({
    id: user._id,
    sessionId: session._id,
  });

  logAuthEvent("login", "success", {
    userId: user._id.toString(),
    email: user.email,
    ip,
    userAgent,
    sessionId: session._id.toString(),
  });

  return {
    user,
    accessToken,
    refreshToken,
    refreshCookieOptions: getRefreshCookieOptions(),
  };
}

export async function authenticateAccessToken(accessToken) {
  if (!accessToken) {
    logAuthEvent("access-token-auth", "failed", {
      reason: "token-missing",
    });
    throw new AppError(401, "Token not found");
  }

  const decoded = jwt.verify(accessToken, config.JWT_SECRET);
  if (!decoded.sessionId) {
    logAuthEvent("access-token-auth", "failed", {
      userId: decoded.id,
      reason: "session-id-missing",
    });
    throw new AppError(401, "Unauthorized");
  }

  const session = await sessionModel.findOne({
    _id: decoded.sessionId,
    userId: decoded.id,
    revoked: false,
  });

  if (!session) {
    logAuthEvent("access-token-auth", "failed", {
      userId: decoded.id,
      sessionId: decoded.sessionId,
      reason: "session-not-active",
    });
    throw new AppError(401, "Unauthorized");
  }

  const user = await userModel.findById(decoded.id).select("-password");

  if (!user) {
    logAuthEvent("access-token-auth", "failed", {
      userId: decoded.id,
      sessionId: decoded.sessionId,
      reason: "user-not-found",
    });
    throw new AppError(404, "User not found");
  }

  logAuthEvent("access-token-auth", "success", {
    userId: user._id.toString(),
    email: user.email,
    sessionId: session._id.toString(),
  });

  return {
    user,
    session,
  };
}

export async function getCurrentUser(accessToken) {
  const { user } = await authenticateAccessToken(accessToken);
  return user;
}

export async function rotateRefreshToken(refreshToken) {
  if (!refreshToken) {
    logAuthEvent("refresh-token", "failed", {
      reason: "token-missing",
    });
    throw new AppError(401, "Refresh token not found");
  }

  const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
  const refreshTokenHash = hashValue(refreshToken);
  const session = await sessionModel.findOne({
    refreshTokenHash,
    revoked: false,
  });

  if (!session) {
    logAuthEvent("refresh-token", "failed", {
      userId: decoded.id,
      reason: "invalid-refresh-token",
    });
    throw new AppError(400, "Invalid refresh token");
  }

  const newRefreshToken = signRefreshToken({ id: decoded.id });

  session.refreshTokenHash = hashValue(newRefreshToken);
  await session.save();

  logAuthEvent("refresh-token", "success", {
    userId: String(decoded.id),
    sessionId: session._id.toString(),
  });

  return {
    accessToken: signAccessToken({
      id: decoded.id,
      sessionId: session._id,
    }),
    refreshToken: newRefreshToken,
    refreshCookieOptions: getRefreshCookieOptions(),
  };
}

export async function revokeCurrentSession(refreshToken) {
  if (!refreshToken) {
    logAuthEvent("logout", "failed", {
      reason: "refresh-token-missing",
    });
    throw new AppError(400, "Refresh token not found");
  }

  const session = await sessionModel.findOne({
    refreshTokenHash: hashValue(refreshToken),
    revoked: false,
  });

  if (!session) {
    logAuthEvent("logout", "failed", {
      reason: "invalid-refresh-token",
    });
    throw new AppError(400, "Invalid refresh token");
  }

  session.revoked = true;
  session.revokedAt = new Date();
  await session.save();
  logAuthEvent("logout", "success", {
    userId: session.userId.toString(),
    sessionId: session._id.toString(),
  });
}

export async function revokeAllSessions(refreshToken) {
  if (!refreshToken) {
    logAuthEvent("logout-all", "failed", {
      reason: "refresh-token-missing",
    });
    throw new AppError(400, "Refresh token not found");
  }

  const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

  const now = new Date();
  const result = await sessionModel.updateMany(
    {
      userId: decoded.id,
      revoked: false,
    },
    { revoked: true, revokedAt: now },
  );
  logAuthEvent("logout-all", "success", {
    userId: String(decoded.id),
    revokedSessionCount: result.modifiedCount,
  });
}

export async function verifyUserEmail({ email, otp }) {
  const otpDoc = await otpModel.findOne({ email }).sort({
    createdAt: -1,
  });

  if (!otpDoc) {
    logAuthEvent("verify-email", "failed", {
      email,
      reason: "otp-not-found",
    });
    throw new AppError(400, "Invalid OTP");
  }

  if (otpDoc.lockedUntil && otpDoc.lockedUntil > new Date()) {
    logAuthEvent("verify-email", "failed", {
      userId: otpDoc.userId.toString(),
      email,
      reason: "otp-locked",
    });
    throw new AppError(
      429,
      "Too many invalid OTP attempts. Please request a new code or try again later.",
    );
  }

  if (otpDoc.expiresAt <= new Date()) {
    await otpModel.deleteOne({ _id: otpDoc._id });
    logAuthEvent("verify-email", "failed", {
      userId: otpDoc.userId.toString(),
      email,
      reason: "otp-expired",
    });
    throw new AppError(400, "OTP has expired");
  }

  if (otpDoc.otpHash !== hashValue(otp)) {
    otpDoc.attemptCount += 1;

    if (otpDoc.attemptCount >= config.OTP_MAX_ATTEMPTS) {
      otpDoc.lockedUntil = new Date(
        Date.now() + config.OTP_LOCKOUT_MINUTES * 60 * 1000,
      );
    }

    await otpDoc.save();

    if (otpDoc.lockedUntil && otpDoc.lockedUntil > new Date()) {
      logAuthEvent("verify-email", "failed", {
        userId: otpDoc.userId.toString(),
        email,
        reason: "otp-locked-after-failures",
        attemptCount: otpDoc.attemptCount,
      });
      throw new AppError(
        429,
        "Too many invalid OTP attempts. Please request a new code or try again later.",
      );
    }

    logAuthEvent("verify-email", "failed", {
      userId: otpDoc.userId.toString(),
      email,
      reason: "invalid-otp",
      attemptCount: otpDoc.attemptCount,
    });
    throw new AppError(400, "Invalid OTP");
  }

  const user = await userModel.findByIdAndUpdate(
    otpDoc.userId,
    { verified: true },
    { returnDocument: "after" },
  ).select("-password");

  if (!user) {
    throw new AppError(404, "User not found");
  }

  await otpModel.deleteMany({
    userId: otpDoc.userId,
  });

  logAuthEvent("verify-email", "success", {
    userId: user._id.toString(),
    email: user.email,
  });

  return user;
}
