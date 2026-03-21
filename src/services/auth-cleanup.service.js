import config from "../config/config.js";
import otpModel from "../models/otp.model.js";
import sessionModel from "../models/session.model.js";

export async function cleanupAuthData(now = new Date()) {
  const revokedSessionCutoff = new Date(
    now.getTime() - config.REVOKED_SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  const [expiredOtpResult, revokedSessionResult] = await Promise.all([
    otpModel.deleteMany({
      expiresAt: { $lte: now },
    }),
    sessionModel.deleteMany({
      revoked: true,
      revokedAt: { $ne: null, $lte: revokedSessionCutoff },
    }),
  ]);

  return {
    deletedExpiredOtps: expiredOtpResult.deletedCount,
    deletedRevokedSessions: revokedSessionResult.deletedCount,
  };
}
