import app from "./src/app.js";
import connectDB from "./src/config/database.js";
import config from "./src/config/config.js";
import { logger } from "./src/utils/logger.js";

connectDB();

app.listen(config.PORT, () => {
  logger.info("Server is running", {
    port: config.PORT,
    environment: config.NODE_ENV,
  });
});
