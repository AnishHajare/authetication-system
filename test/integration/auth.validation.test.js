import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
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

test("register returns 400 for invalid payloads", async () => {
  const client = createTestClient();

  const response = await client.post("/api/auth/register").send({
    userName: "ab",
    email: "invalid-email",
    password: "short",
  });

  assert.equal(response.status, 400);
  assert.ok(Array.isArray(response.body.details));
  assert.ok(response.body.details.length >= 1);
});

test("verify-email returns 400 for invalid payloads", async () => {
  const client = createTestClient();

  const response = await client.post("/api/auth/verify-email").send({
    email: "invalid-email",
    otp: "12",
  });

  assert.equal(response.status, 400);
  assert.ok(Array.isArray(response.body.details));
});

test("rate limited routes return 429 after repeated requests", async () => {
  const client = createTestClient();
  await createUser({
    email: "anish@example.com",
    verified: false,
  });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await client.post("/api/auth/login").send({
      email: "anish@example.com",
      password: "password123",
    });

    assert.notEqual(response.status, 429);
  }

  const rateLimitedResponse = await client.post("/api/auth/login").send({
    email: "anish@example.com",
    password: "password123",
  });

  assert.equal(rateLimitedResponse.status, 429);
});
