import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import sessionModel from "../../src/models/session.model.js";
import {
  createLoginUser,
  createTestClient,
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

test("login rejects unverified users", async () => {
  const client = createTestClient();
  const { user, password } = await createLoginUser({
    email: "anish@example.com",
    verified: false,
  });

  const response = await client.post("/api/auth/login").send({
    email: user.email,
    password,
  });

  assert.equal(response.status, 401);
  assert.match(response.body.message, /not verified/i);
});

test("login rejects invalid credentials", async () => {
  const client = createTestClient();
  const { user } = await createLoginUser({
    email: "anish@example.com",
  });

  const response = await client.post("/api/auth/login").send({
    email: user.email,
    password: "wrong-password",
  });

  assert.equal(response.status, 401);
  assert.match(response.body.message, /invalid credentials/i);
});

test("login succeeds and creates a session with a refresh cookie", async () => {
  const client = createTestClient();
  const { user, password } = await createLoginUser({
    email: "anish@example.com",
  });

  const response = await client.post("/api/auth/login").send({
    email: user.email,
    password,
  });

  const session = await sessionModel.findOne({ userId: user._id });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, user.email);
  assert.ok(response.body.accessToken);
  assert.ok(response.headers["set-cookie"]);
  assert.ok(
    response.headers["set-cookie"].some((cookie) =>
      cookie.startsWith("refreshToken="),
    ),
  );
  assert.ok(session);
});
