import { logger } from "./logger.js";

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : undefined;
}

function sanitizeMeta(meta = {}) {
  const {
    password,
    otp,
    accessToken,
    refreshToken,
    refreshTokenHash,
    otpHash,
    ...safeMeta
  } = meta;

  if (safeMeta.email) {
    safeMeta.email = normalizeEmail(safeMeta.email);
  }

  return safeMeta;
}

export function logAuthEvent(action, outcome, meta = {}) {
  logger.info("Auth event", {
    category: "auth",
    action,
    outcome,
    ...sanitizeMeta(meta),
  });
}
