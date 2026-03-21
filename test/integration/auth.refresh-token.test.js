import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createLoginUser,
  createRequestClient,
  createTestClient,
  decodeRefreshTokenFromCookie,
  findSessionByRefreshToken,
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

test("refresh-token rotates the refresh token and returns a new access token", async () => {
  const client = createTestClient();
  const { user, password } = await createLoginUser({
    email: "anish@example.com",
  });

  const loginResponse = await client.post("/api/auth/login").send({
    email: user.email,
    password,
  });
  const oldRefreshToken = decodeRefreshTokenFromCookie(
    loginResponse.headers["set-cookie"],
  );

  const refreshResponse = await client.post("/api/auth/refresh-token");
  const newRefreshToken = decodeRefreshTokenFromCookie(
    refreshResponse.headers["set-cookie"],
  );

  assert.equal(refreshResponse.status, 200);
  assert.ok(refreshResponse.body.accessToken);
  assert.ok(newRefreshToken);
  assert.notEqual(newRefreshToken, oldRefreshToken);
  assert.equal(await findSessionByRefreshToken(oldRefreshToken), null);
  assert.ok(await findSessionByRefreshToken(newRefreshToken));
});

test("refresh-token rejects reuse of the old refresh token after rotation", async () => {
  const client = createTestClient();
  const { user, password } = await createLoginUser({
    email: "anish@example.com",
  });

  const loginResponse = await client.post("/api/auth/login").send({
    email: user.email,
    password,
  });
  const oldRefreshToken = decodeRefreshTokenFromCookie(
    loginResponse.headers["set-cookie"],
  );

  await client.post("/api/auth/refresh-token");

  const reusedResponse = await createRequestClient()
    .post("/api/auth/refresh-token")
    .set("Cookie", [`refreshToken=${oldRefreshToken}`]);

  assert.equal(reusedResponse.status, 400);
  assert.match(reusedResponse.body.message, /invalid refresh token/i);
});
