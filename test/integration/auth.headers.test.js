import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
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

test("auth routes include baseline security headers", async () => {
  const client = createTestClient();

  const response = await client.get("/api/auth/get-me");

  assert.equal(response.status, 401);
  assert.equal(response.headers["x-dns-prefetch-control"], "off");
  assert.equal(response.headers["x-frame-options"], "SAMEORIGIN");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["referrer-policy"], "no-referrer");
});
