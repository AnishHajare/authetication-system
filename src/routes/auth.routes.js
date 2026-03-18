import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { rateLimit } from "../middleware/rate-limit.middleware.js";
import {
  validateEmailOnly,
  validateLogin,
  validateRegister,
  validateVerifyEmail,
} from "../middleware/validate.middleware.js";

const authRouter = Router();

authRouter.post(
  "/register",
  rateLimit("register"),
  validateRegister,
  asyncHandler(authController.register),
);
authRouter.post(
  "/login",
  rateLimit("login"),
  validateLogin,
  asyncHandler(authController.login),
);
authRouter.get("/get-me", asyncHandler(authController.getMe));
authRouter.get(
  "/refresh-token",
  rateLimit("refresh-token"),
  asyncHandler(authController.refreshToken),
);
authRouter.get("/logout", asyncHandler(authController.logout));
authRouter.get("/logout-all", asyncHandler(authController.logoutAll));
authRouter.post(
  "/verify-email",
  rateLimit("verify-email"),
  validateVerifyEmail,
  asyncHandler(authController.verifyEmail),
);
authRouter.post(
  "/resend-verification-email",
  rateLimit("resend-verification-email"),
  validateEmailOnly,
  asyncHandler(authController.resendVerification),
);

export default authRouter;
