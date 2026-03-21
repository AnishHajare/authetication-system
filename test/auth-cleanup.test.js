import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import otpModel from "../src/models/otp.model.js";
import sessionModel from "../src/models/session.model.js";
import { cleanupAuthData } from "../src/services/auth-cleanup.service.js";
import {
  createOtpForUser,
  createSessionForUser,
  createUser,
  resetTestDoubles,
} from "./helpers/test-app.js";
import {
  clearDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from "./helpers/test-db.js";

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

test("cleanupAuthData removes expired otps and stale revoked sessions only", async () => {
  const user = await createUser({
    email: "cleanup@example.com",
    verified: true,
  });

  await createOtpForUser(user, "123456", {
    expiresAt: new Date(Date.now() - 60_000),
  });
  await createOtpForUser(user, "654321", {
    expiresAt: new Date(Date.now() + 60_000),
  });

  const staleRevokedSession = await createSessionForUser(user, {
    revoked: true,
    revokedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
  });
  const freshRevokedSession = await createSessionForUser(user, {
    revoked: true,
    revokedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });
  const activeSession = await createSessionForUser(user, {
    revoked: false,
  });

  const result = await cleanupAuthData(new Date());

  assert.equal(result.deletedExpiredOtps, 1);
  assert.equal(result.deletedRevokedSessions, 1);
  assert.equal(await otpModel.countDocuments(), 1);
  assert.equal(
    await sessionModel.countDocuments({ _id: staleRevokedSession._id }),
    0,
  );
  assert.equal(
    await sessionModel.countDocuments({ _id: freshRevokedSession._id }),
    1,
  );
  assert.equal(
    await sessionModel.countDocuments({ _id: activeSession._id }),
    1,
  );
});
