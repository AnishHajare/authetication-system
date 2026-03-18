import AppError from "../utils/app-error.js";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isEmail(value) {
  return isNonEmptyString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

export function validateRegister(req, res, next) {
  const { userName, email, password } = req.body;
  const errors = [];

  if (!isNonEmptyString(userName) || userName.trim().length < 3) {
    errors.push("userName must be at least 3 characters long");
  }

  const normalizedEmail = normalizeEmail(email);

  if (!isEmail(normalizedEmail)) {
    errors.push("email must be a valid email address");
  }

  if (!isNonEmptyString(password) || password.length < 8) {
    errors.push("password must be at least 8 characters long");
  }

  if (errors.length > 0) {
    return next(new AppError(400, "Invalid registration payload", errors));
  }

  req.body = {
    userName: userName.trim(),
    email: normalizedEmail,
    password,
  };

  return next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  const normalizedEmail = normalizeEmail(email);

  if (!isEmail(normalizedEmail)) {
    errors.push("email must be a valid email address");
  }

  if (!isNonEmptyString(password)) {
    errors.push("password is required");
  }

  if (errors.length > 0) {
    return next(new AppError(400, "Invalid login payload", errors));
  }

  req.body = {
    email: normalizedEmail,
    password,
  };

  return next();
}

export function validateVerifyEmail(req, res, next) {
  const { otp, email } = req.body;
  const errors = [];

  const normalizedEmail = normalizeEmail(email);

  if (!isEmail(normalizedEmail)) {
    errors.push("email must be a valid email address");
  }

  if (!isNonEmptyString(otp) || !/^\d{6}$/.test(otp.trim())) {
    errors.push("otp must be a 6 digit code");
  }

  if (errors.length > 0) {
    return next(new AppError(400, "Invalid email verification payload", errors));
  }

  req.body = {
    email: normalizedEmail,
    otp: otp.trim(),
  };

  return next();
}

export function validateEmailOnly(req, res, next) {
  const { email } = req.body;

  const normalizedEmail = normalizeEmail(email);

  if (!isEmail(normalizedEmail)) {
    return next(
      new AppError(400, "Invalid payload", ["email must be a valid email address"]),
    );
  }

  req.body = {
    email: normalizedEmail,
  };

  return next();
}
