import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createAccessToken,
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

test("get-me returns the current user for a valid access token", async () => {
  const client = createTestClient();
  const user = await createUser({
    email: "anish@example.com",
    verified: true,
  });
  const accessToken = createAccessToken(user._id.toString());

  const response = await client
    .get("/api/auth/get-me")
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.user.email, user.email);
  assert.equal(response.body.user.password, undefined);
});

test("get-me rejects missing access tokens", async () => {
  const client = createTestClient();

  const response = await client.get("/api/auth/get-me");

  assert.equal(response.status, 401);
  assert.match(response.body.message, /token not found/i);
});
