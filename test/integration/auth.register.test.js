import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import otpModel from "../../src/models/otp.model.js";
import userModel from "../../src/models/user.model.js";
import {
  createTestClient,
  extractOtpFromEmail,
  installEmailSpy,
  installFailingEmailSender,
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

test("register creates an unverified user, otp record, and sends email", async () => {
  const sentEmails = installEmailSpy();
  const client = createTestClient();

  const response = await client.post("/api/auth/register").send({
    userName: "anish",
    email: "anish@example.com",
    password: "password123",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.verified, false);
  assert.equal(await userModel.countDocuments(), 1);
  assert.equal(await otpModel.countDocuments(), 1);
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, "anish@example.com");
  assert.match(sentEmails[0].subject, /OTP Verification/);
  assert.match(sentEmails[0].text, /\d{6}/);
  assert.equal(extractOtpFromEmail(sentEmails[0])?.length, 6);
});

test("register rolls back the user and otp when email delivery fails", async () => {
  installFailingEmailSender();
  const client = createTestClient();

  const response = await client.post("/api/auth/register").send({
    userName: "anish",
    email: "anish@example.com",
    password: "password123",
  });

  assert.equal(response.status, 502);
  assert.match(response.body.message, /rolled back/i);
  assert.equal(await userModel.countDocuments(), 0);
  assert.equal(await otpModel.countDocuments(), 0);
});

test("register rejects duplicate usernames or emails", async () => {
  installEmailSpy();
  const client = createTestClient();

  await client.post("/api/auth/register").send({
    userName: "anish",
    email: "anish@example.com",
    password: "password123",
  });

  const response = await client.post("/api/auth/register").send({
    userName: "anish",
    email: "other@example.com",
    password: "password123",
  });

  assert.equal(response.status, 409);
  assert.match(response.body.message, /unable to register/i);
});
