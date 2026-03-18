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
  await sendEmail(
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
    throw new AppError(409, "Username or email already exists");
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
    throw new AppError(
      502,
      "Failed to deliver verification email. Registration was rolled back.",
    );
  }

  return user;
}

export async function resendVerificationEmail(email) {
  const user = await userModel.findOne({ email });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.verified) {
    throw new AppError(400, "Email is already verified");
  }

  const latestOtp = await otpModel.findOne({ userId: user._id }).sort({
    createdAt: -1,
  });

  if (latestOtp) {
    const nextAllowedAt =
      latestOtp.createdAt.getTime() +
      config.OTP_RESEND_COOLDOWN_SECONDS * 1000;

    if (nextAllowedAt > Date.now()) {
      throw new AppError(
        429,
        `Please wait ${config.OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting another OTP`,
      );
    }
  }

  await sendVerificationEmail(user);
}

export async function loginUser({ email, password, ip, userAgent }) {
  const user = await userModel.findOne({ email });

  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }

  if (!user.verified) {
    throw new AppError(401, "Email not verified");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError(401, "Invalid credentials");
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

  return {
    user,
    accessToken,
    refreshToken,
    refreshCookieOptions: getRefreshCookieOptions(),
  };
}

export async function getCurrentUser(accessToken) {
  if (!accessToken) {
    throw new AppError(401, "Token not found");
  }

  const decoded = jwt.verify(accessToken, config.JWT_SECRET);
  const user = await userModel.findById(decoded.id).select("-password");

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
}

export async function rotateRefreshToken(refreshToken) {
  if (!refreshToken) {
    throw new AppError(401, "Refresh token not found");
  }

  const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
  const refreshTokenHash = hashValue(refreshToken);
  const session = await sessionModel.findOne({
    refreshTokenHash,
    revoked: false,
  });

  if (!session) {
    throw new AppError(400, "Invalid refresh token");
  }

  const newRefreshToken = signRefreshToken({ id: decoded.id });

  session.refreshTokenHash = hashValue(newRefreshToken);
  await session.save();

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
    throw new AppError(400, "Refresh token not found");
  }

  const session = await sessionModel.findOne({
    refreshTokenHash: hashValue(refreshToken),
    revoked: false,
  });

  if (!session) {
    throw new AppError(400, "Invalid refresh token");
  }

  session.revoked = true;
  await session.save();
}

export async function revokeAllSessions(refreshToken) {
  if (!refreshToken) {
    throw new AppError(400, "Refresh token not found");
  }

  const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

  await sessionModel.updateMany(
    {
      userId: decoded.id,
      revoked: false,
    },
    { revoked: true },
  );
}

export async function verifyUserEmail({ email, otp }) {
  const otpDoc = await otpModel.findOne({
    email,
    otpHash: hashValue(otp),
  });

  if (!otpDoc) {
    throw new AppError(400, "Invalid OTP");
  }

  if (otpDoc.expiresAt <= new Date()) {
    await otpModel.deleteOne({ _id: otpDoc._id });
    throw new AppError(400, "OTP has expired");
  }

  const user = await userModel.findByIdAndUpdate(
    otpDoc.userId,
    { verified: true },
    { new: true },
  ).select("-password");

  if (!user) {
    throw new AppError(404, "User not found");
  }

  await otpModel.deleteMany({
    userId: otpDoc.userId,
  });

  return user;
}
