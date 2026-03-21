import mongoose from "mongoose";
import config from "../src/config/config.js";
import { cleanupAuthData } from "../src/services/auth-cleanup.service.js";
import { logger } from "../src/utils/logger.js";

async function main() {
  await mongoose.connect(config.MONGO_URI);

  try {
    const result = await cleanupAuthData();
    logger.info("Auth data cleanup completed", result);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  logger.error("Auth data cleanup failed", {
    error: error.message,
  });
  process.exitCode = 1;
});
