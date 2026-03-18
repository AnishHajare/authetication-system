import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import otpModel from "../../src/models/otp.model.js";
import userModel from "../../src/models/user.model.js";
import {
  createOtpForUser,
  createTestClient,
  createUser,
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
