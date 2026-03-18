import express from "express";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
