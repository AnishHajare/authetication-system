import "./env.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;
const useExternalMongo = process.env.TEST_USE_EXTERNAL_MONGO === "true";

export async function connectTestDatabase() {
  if (useExternalMongo) {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "authentication-system-test",
    });
    return;
  }

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "authentication-system-test",
  });
}

export async function clearDatabase() {
  const collections = mongoose.connection.collections;

  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
}

export async function disconnectTestDatabase() {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = undefined;
  }
}
