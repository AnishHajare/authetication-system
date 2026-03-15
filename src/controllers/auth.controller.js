import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt, { decode } from "jsonwebtoken";
import config from "../config/config.js";

export async function register(req, res) {
  const { userName, email, password } = req.body;

  const isAlreadyRegistered = await userModel.findOne({
    $or: [{ userName }, { email }],
  });

  if (isAlreadyRegistered) {
    return res.status(409).json({
      message: "Username or email already exists",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userModel.create({
    userName,
    email,
    password: hashedPassword,
  });

  const accessToken = jwt.sign(
    {
      id: user._id,
    },
    config.JWT_SECRET,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    {
      id: user._id,
    },
    config.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    message: "User registered successfully",
    user: {
      userName: user.userName,
      email: user.email,
    },
    accessToken,
  });
}

export async function getMe(req, res) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Token not found",
    });
  }

  const decoded = jwt.verify(token, config.JWT_SECRET);
  console.log({ decoded });
}

export async function refreshToken(req, res) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      message: "Refresh token not found",
    });
  }

  const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
  const accessToken = jwt.sign(
    {
      id: decoded.id,
    },
    config.JWT_SECRET,
    { expiresIn: "15m" },
  );

  const newRefreshToken = jwt.sign(
    {
      id: decoded.id,
    },
    config.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.status(200).json({
    message: "Access token refreshed sucessfully",
    accessToken,
  });
}
