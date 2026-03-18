process.env.NODE_ENV = "test";
process.env.PORT = "3001";
process.env.MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/authentication-system-test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-client-id";
process.env.GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "test-client-secret";
process.env.GOOGLE_REFRESH_TOKEN =
  process.env.GOOGLE_REFRESH_TOKEN || "test-refresh-token";
process.env.GOOGLE_USER = process.env.GOOGLE_USER || "sender@example.com";
process.env.MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Authentication System";
process.env.ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN =
  process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
process.env.OTP_EXPIRY_MINUTES = process.env.OTP_EXPIRY_MINUTES || "10";
process.env.OTP_RESEND_COOLDOWN_SECONDS =
  process.env.OTP_RESEND_COOLDOWN_SECONDS || "60";
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || "900000";
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || "20";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAME_SITE = "strict";
