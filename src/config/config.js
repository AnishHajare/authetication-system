import dotenv from "dotenv";

dotenv.config();

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined in env`);
  }

  return value;
}

function numberEnv(name, defaultValue) {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a number`);
  }

  return parsed;
}

const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: numberEnv("PORT", 3000),
  MONGO_URI: requiredEnv("MONGO_URI"),
  JWT_SECRET: requiredEnv("JWT_SECRET"),
  GOOGLE_CLIENT_ID: requiredEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: requiredEnv("GOOGLE_CLIENT_SECRET"),
  GOOGLE_REFRESH_TOKEN: requiredEnv("GOOGLE_REFRESH_TOKEN"),
  GOOGLE_USER: requiredEnv("GOOGLE_USER"),
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || "Authentication System",
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  OTP_EXPIRY_MINUTES: numberEnv("OTP_EXPIRY_MINUTES", 10),
  OTP_MAX_ATTEMPTS: numberEnv("OTP_MAX_ATTEMPTS", 5),
  OTP_LOCKOUT_MINUTES: numberEnv("OTP_LOCKOUT_MINUTES", 15),
  OTP_RESEND_COOLDOWN_SECONDS: numberEnv("OTP_RESEND_COOLDOWN_SECONDS", 60),
  RATE_LIMIT_WINDOW_MS: numberEnv("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: numberEnv("RATE_LIMIT_MAX_REQUESTS", 20),
  COOKIE_SECURE:
    process.env.COOKIE_SECURE === "true" ||
    (process.env.COOKIE_SECURE !== "false" &&
      (process.env.NODE_ENV || "development") === "production"),
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || "strict",
};

export default config;
