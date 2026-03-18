import mongoose from "mongoose";
import config from "./config.js";
import { logger } from "../utils/logger.js";

async function connectDB() {
  await mongoose.connect(config.MONGO_URI);

  logger.info("Connected to DB");
}

export default connectDB;
