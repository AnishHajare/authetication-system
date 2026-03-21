import "./env.js";
import request from "supertest";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "../../src/config/config.js";
import app from "../../src/app.js";
import otpModel from "../../src/models/otp.model.js";
import sessionModel from "../../src/models/session.model.js";
import userModel from "../../src/models/user.model.js";
import {
  resetEmailSender,
  setEmailSender,
} from "../../src/services/auth.service.js";
import { resetRateLimitStore } from "../../src/middleware/rate-limit.middleware.js";

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createTestClient() {
  return request.agent(app);
}

export function createRequestClient() {
  return request(app);
}

export function resetTestDoubles() {
  resetEmailSender();
  resetRateLimitStore();
}

export function installEmailSpy() {
  const sentEmails = [];

  setEmailSender(async (to, subject, text, html) => {
    sentEmails.push({ to, subject, text, html });
  });

  return sentEmails;
}

export function installFailingEmailSender(message = "Email delivery failed") {
  setEmailSender(async () => {
    throw new Error(message);
  });
}

export function extractOtpFromEmail(email) {
  const match = email?.text?.match(/(\d{6})/);

  return match ? match[1] : null;
}

export async function createUser(overrides = {}) {
  return userModel.create({
    userName: overrides.userName || `user-${Date.now()}`,
    email: overrides.email || `user-${Date.now()}@example.com`,
    password: overrides.password || "hashed-password",
    verified: overrides.verified ?? false,
  });
}

export async function createLoginUser(overrides = {}) {
  const password = overrides.password || "password123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userModel.create({
    userName: overrides.userName || `login-${Date.now()}`,
    email: overrides.email || `login-${Date.now()}@example.com`,
    password: hashedPassword,
    verified: overrides.verified ?? true,
  });

  return { user, password };
}

export async function createSessionForUser(user, overrides = {}) {
  return sessionModel.create({
    userId: user._id,
    refreshTokenHash:
      overrides.refreshTokenHash || hashValue(`refresh-${user._id}-${Date.now()}`),
    ip: overrides.ip || "127.0.0.1",
    userAgent: overrides.userAgent || "test-agent",
    revoked: overrides.revoked ?? false,
  });
}

export async function createOtpForUser(user, otp = "123456", overrides = {}) {
  const otpDoc = await otpModel.create({
    email: user.email,
    userId: user._id,
    otpHash: hashValue(otp),
    expiresAt:
      overrides.expiresAt ||
      new Date(Date.now() + 10 * 60 * 1000),
    attemptCount: overrides.attemptCount ?? 0,
    lockedUntil: overrides.lockedUntil ?? null,
  });

  if (overrides.createdAt || overrides.updatedAt) {
    await otpModel.collection.updateOne(
      { _id: otpDoc._id },
      {
        $set: {
          ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
          ...(overrides.updatedAt ? { updatedAt: overrides.updatedAt } : {}),
        },
      },
    );

    return otpModel.findById(otpDoc._id);
  }

  return otpDoc;
}

export function createAccessToken(userId, sessionId = undefined) {
  return jwt.sign(
    {
      id: userId,
      ...(sessionId ? { sessionId } : {}),
    },
    config.JWT_SECRET,
    { expiresIn: config.ACCESS_TOKEN_EXPIRES_IN },
  );
}

export function decodeRefreshTokenFromCookie(setCookieHeader) {
  const refreshCookie = setCookieHeader?.find((cookie) =>
    cookie.startsWith("refreshToken="),
  );

  if (!refreshCookie) {
    return null;
  }

  return refreshCookie.split(";")[0].replace("refreshToken=", "");
}

export async function findSessionByRefreshToken(refreshToken) {
  return sessionModel.findOne({
    refreshTokenHash: hashValue(refreshToken),
  });
}
