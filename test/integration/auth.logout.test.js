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

test("logout revokes only the current session", async () => {
  const agentOne = createTestClient();
  const agentTwo = createTestClient();
  const { user, password } = await createLoginUser({
    email: "anish@example.com",
  });

  const loginOne = await agentOne.post("/api/auth/login").send({
    email: user.email,
    password,
  });
  await agentTwo.post("/api/auth/login").send({
    email: user.email,
    password,
  });

  const beforeLogout = await sessionModel.find({ userId: user._id });
  const logoutResponse = await agentOne.post("/api/auth/logout");
  const afterLogout = await sessionModel.find({ userId: user._id });

  assert.equal(beforeLogout.length, 2);
  assert.equal(logoutResponse.status, 200);
  assert.equal(afterLogout.filter((session) => session.revoked).length, 1);
  assert.equal(afterLogout.filter((session) => !session.revoked).length, 1);

  const getMeResponse = await agentOne
    .get("/api/auth/get-me")
    .set("Authorization", `Bearer ${loginOne.body.accessToken}`);

  assert.equal(getMeResponse.status, 401);
});

test("logout-all revokes all active sessions for the user", async () => {
  const agentOne = createTestClient();
  const agentTwo = createTestClient();
  const { user, password } = await createLoginUser({
    email: "anish@example.com",
  });

  const loginOne = await agentOne.post("/api/auth/login").send({
    email: user.email,
    password,
  });
  await agentTwo.post("/api/auth/login").send({
    email: user.email,
    password,
  });

  const response = await agentOne.post("/api/auth/logout-all");
  const sessions = await sessionModel.find({ userId: user._id });

  assert.equal(response.status, 200);
  assert.equal(sessions.length, 2);
  assert.equal(sessions.every((session) => session.revoked), true);

  const getMeResponse = await agentOne
    .get("/api/auth/get-me")
    .set("Authorization", `Bearer ${loginOne.body.accessToken}`);

  assert.equal(getMeResponse.status, 401);
});
