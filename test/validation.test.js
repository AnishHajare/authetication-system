import test from "node:test";
import assert from "node:assert/strict";
import {
  validateEmailOnly,
  validateLogin,
  validateRegister,
  validateVerifyEmail,
} from "../src/middleware/validate.middleware.js";

function runMiddleware(middleware, body) {
  return new Promise((resolve, reject) => {
    const req = { body };
    const res = {};

    middleware(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(req.body);
    });
  });
}

test("validateRegister normalizes a valid payload", async () => {
  const body = await runMiddleware(validateRegister, {
    userName: "  anish  ",
    email: "  TEST@Example.com ",
    password: "password123",
  });

  assert.deepEqual(body, {
    userName: "anish",
    email: "test@example.com",
    password: "password123",
  });
});

test("validateRegister rejects short passwords", async () => {
  await assert.rejects(
    runMiddleware(validateRegister, {
      userName: "anish",
      email: "test@example.com",
      password: "short",
    }),
    /Invalid registration payload/,
  );
});

test("validateLogin normalizes a valid payload", async () => {
  const body = await runMiddleware(validateLogin, {
    email: "  TEST@Example.com ",
    password: "password123",
  });

  assert.deepEqual(body, {
    email: "test@example.com",
    password: "password123",
  });
});

test("validateVerifyEmail accepts a 6 digit OTP", async () => {
  const body = await runMiddleware(validateVerifyEmail, {
    email: "user@example.com",
    otp: "123456",
  });

  assert.deepEqual(body, {
    email: "user@example.com",
    otp: "123456",
  });
});

test("validateEmailOnly rejects invalid emails", async () => {
  await assert.rejects(
    runMiddleware(validateEmailOnly, {
      email: "invalid-email",
    }),
    /Invalid payload/,
  );
});
