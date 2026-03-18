import test from "node:test";
import assert from "node:assert/strict";

function runRateLimit(middleware, ip = "::1") {
  return new Promise((resolve, reject) => {
    middleware({ ip }, {}, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

test("rateLimit blocks requests after the configured threshold", async () => {
  process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "client-id";
  process.env.GOOGLE_CLIENT_SECRET =
    process.env.GOOGLE_CLIENT_SECRET || "client-secret";
  process.env.GOOGLE_REFRESH_TOKEN =
    process.env.GOOGLE_REFRESH_TOKEN || "refresh-token";
  process.env.GOOGLE_USER = process.env.GOOGLE_USER || "sender@example.com";

  const { rateLimit } = await import("../src/middleware/rate-limit.middleware.js");
  const middleware = rateLimit(`test-${Date.now()}`);
  let rejected = false;

  for (let index = 0; index < 20; index += 1) {
    await runRateLimit(middleware);
  }

  try {
    await runRateLimit(middleware);
  } catch (error) {
    rejected = true;
    assert.match(error.message, /Too many requests/);
  }

  assert.equal(rejected, true);
});
