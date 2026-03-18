import "./env.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

export async function connectTestDatabase() {
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
