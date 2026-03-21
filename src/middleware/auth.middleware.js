import { authenticateAccessToken } from "../services/auth.service.js";

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  const auth = await authenticateAccessToken(token);

  req.auth = auth;
  next();
}
