import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "users",
      required: [true, "User id is required"],
    },
    otpHash: {
      type: String,
      required: [true, "OTP hash is required"],
    },
    expiresAt: {
      type: Date,
      required: [true, "OTP expiry is required"],
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const otpModel = mongoose.model("otps", otpSchema);

export default otpModel;
