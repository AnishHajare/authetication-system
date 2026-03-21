import {
  loginUser,
  registerUser,
  resendVerificationEmail,
  revokeAllSessions,
  revokeCurrentSession,
  rotateRefreshToken,
  verifyUserEmail,
} from "../services/auth.service.js";

export async function register(req, res) {
  const user = await registerUser(req.body);

  res.status(201).json({
    message: "User registered successfully",
    user: {
      userName: user.userName,
      email: user.email,
      verified: user.verified,
    },
  });
}

export async function login(req, res) {
  const { user, accessToken, refreshToken, refreshCookieOptions } =
    await loginUser({
      ...req.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  res.status(201).json({
    message: "User logged in successfully",
    user: {
      userName: user.userName,
      email: user.email,
    },
    accessToken,
  });
}

export async function getMe(req, res) {
  res.status(200).json({
    user: req.auth.user,
  });
}

export async function refreshToken(req, res) {
  const { accessToken, refreshToken, refreshCookieOptions } =
    await rotateRefreshToken(req.cookies.refreshToken);

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
  res.status(200).json({
    message: "Access token refreshed successfully",
    accessToken,
  });
}

export async function logout(req, res) {
  await revokeCurrentSession(req.cookies.refreshToken);

  res.clearCookie("refreshToken");

  res.status(200).json({
    message: "Logged out successfully",
  });
}

export async function logoutAll(req, res) {
  await revokeAllSessions(req.cookies.refreshToken);

  res.clearCookie("refreshToken");

  res.status(200).json({
    message: "Logged out from all devices successfully",
  });
}

export async function verifyEmail(req, res) {
  const user = await verifyUserEmail(req.body);

  res.status(200).json({
    message: "Email verified successfully",
    user: {
      userName: user.userName,
      email: user.email,
      verified: user.verified,
    },
  });
}

export async function resendVerification(req, res) {
  await resendVerificationEmail(req.body.email);

  res.status(200).json({
    message: "If the account exists, a verification email will be sent",
  });
}
