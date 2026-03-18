import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import otpModel from "../../src/models/otp.model.js";
import {
  createOtpForUser,
  createTestClient,
  createUser,
  installEmailSpy,
  resetTestDoubles,
} from "../helpers/test-app.js";
import {
  clearDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from "../helpers/test-db.js";

before(async () => {
  await connectTestDatabase();
});

after(async () => {
  await disconnectTestDatabase();
});

beforeEach(async () => {
  resetTestDoubles();
  await clearDatabase();
});

test("resend verification sends a new otp after the cooldown window", async () => {
  const client = createTestClient();
  const sentEmails = installEmailSpy();
  const user = await createUser({
    email: "anish@example.com",
  });

  const oldOtp = await createOtpForUser(user, "123456", {
    createdAt: new Date(Date.now() - 61_000),
    updatedAt: new Date(Date.now() - 61_000),
  });

  const response = await client
    .post("/api/auth/resend-verification-email")
    .send({ email: user.email });

  const otpDocs = await otpModel.find({ userId: user._id });

  assert.equal(response.status, 200);
  assert.equal(sentEmails.length, 1);
  assert.equal(otpDocs.length, 1);
  assert.notEqual(String(otpDocs[0]._id), String(oldOtp._id));
});

test("resend verification is blocked during cooldown", async () => {
  const client = createTestClient();
  installEmailSpy();
  const user = await createUser({
    email: "anish@example.com",
  });

  await createOtpForUser(user, "123456");

  const response = await client
    .post("/api/auth/resend-verification-email")
    .send({ email: user.email });

  assert.equal(response.status, 429);
  assert.match(response.body.message, /please wait/i);
});

test("resend verification rejects already verified users", async () => {
  const client = createTestClient();
  installEmailSpy();
  const user = await createUser({
    email: "anish@example.com",
    verified: true,
  });

  const response = await client
    .post("/api/auth/resend-verification-email")
    .send({ email: user.email });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /already verified/i);
});
