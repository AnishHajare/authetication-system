import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import otpModel from "../../src/models/otp.model.js";
import userModel from "../../src/models/user.model.js";
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

test("verify-email marks the user as verified and removes otp records", async () => {
  const client = createTestClient();
  const user = await createUser({
    email: "anish@example.com",
  });

  await createOtpForUser(user, "123456");

  const response = await client.post("/api/auth/verify-email").send({
    email: "anish@example.com",
    otp: "123456",
  });

  const updatedUser = await userModel.findById(user._id);

  assert.equal(response.status, 200);
  assert.equal(updatedUser.verified, true);
  assert.equal(await otpModel.countDocuments(), 0);
});

test("verify-email rejects an invalid otp", async () => {
  const client = createTestClient();
  const user = await createUser({
    email: "anish@example.com",
  });

  await createOtpForUser(user, "123456");

  const response = await client.post("/api/auth/verify-email").send({
    email: "anish@example.com",
    otp: "000000",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /invalid otp/i);
});

test("verify-email locks the otp after repeated invalid attempts", async () => {
  const client = createTestClient();
  const user = await createUser({
    email: "anish@example.com",
  });

  await createOtpForUser(user, "123456");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await client.post("/api/auth/verify-email").send({
      email: "anish@example.com",
      otp: "000000",
    });

    assert.equal(response.status, 400);
  }

  const lockedResponse = await client.post("/api/auth/verify-email").send({
    email: "anish@example.com",
    otp: "000000",
  });

  const otpDoc = await otpModel.findOne({ userId: user._id });

  assert.equal(lockedResponse.status, 429);
  assert.match(lockedResponse.body.message, /too many invalid otp attempts/i);
  assert.equal(otpDoc.attemptCount, 5);
  assert.ok(otpDoc.lockedUntil);
});

test("resending a verification code resets otp lock state", async () => {
  const client = createTestClient();
  const sentEmails = installEmailSpy();
  const user = await createUser({
    email: "anish@example.com",
  });

  await createOtpForUser(user, "123456", {
    attemptCount: 5,
    lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
    createdAt: new Date(Date.now() - 61_000),
    updatedAt: new Date(Date.now() - 61_000),
  });

  const response = await client.post("/api/auth/resend-verification-email").send({
    email: "anish@example.com",
  });

  const otpDoc = await otpModel.findOne({ userId: user._id });

  assert.equal(response.status, 200);
  assert.equal(sentEmails.length, 1);
  assert.equal(otpDoc.attemptCount, 0);
  assert.equal(otpDoc.lockedUntil, null);
});

test("verify-email rejects an expired otp", async () => {
  const client = createTestClient();
  const user = await createUser({
    email: "anish@example.com",
  });

  await createOtpForUser(user, "123456", {
    expiresAt: new Date(Date.now() - 1_000),
  });

  const response = await client.post("/api/auth/verify-email").send({
    email: "anish@example.com",
    otp: "123456",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /expired/i);
  assert.equal(await otpModel.countDocuments(), 0);
});
