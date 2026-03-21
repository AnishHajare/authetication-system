import test from "node:test";
import assert from "node:assert/strict";
import { logAuthEvent } from "../src/utils/audit-log.js";

test("logAuthEvent excludes sensitive fields from structured logs", () => {
  const originalLog = console.log;
  const messages = [];

  console.log = (message) => {
    messages.push(message);
  };

  try {
    logAuthEvent("login", "failed", {
      email: "USER@Example.com",
      password: "secret",
      otp: "123456",
      accessToken: "token",
      refreshToken: "refresh",
      refreshTokenHash: "hash",
      otpHash: "otp-hash",
      reason: "invalid-credentials",
    });
  } finally {
    console.log = originalLog;
  }

  assert.equal(messages.length, 1);
  const payload = JSON.parse(messages[0]);

  assert.equal(payload.category, "auth");
  assert.equal(payload.action, "login");
  assert.equal(payload.outcome, "failed");
  assert.equal(payload.email, "user@example.com");
  assert.equal(payload.reason, "invalid-credentials");
  assert.equal("password" in payload, false);
  assert.equal("otp" in payload, false);
  assert.equal("accessToken" in payload, false);
  assert.equal("refreshToken" in payload, false);
  assert.equal("refreshTokenHash" in payload, false);
  assert.equal("otpHash" in payload, false);
});
