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
    },
  },
  {
    timestamps: true,
  },
);

const otpModel = mongoose.model("otps", otpSchema);

export default otpModel;
