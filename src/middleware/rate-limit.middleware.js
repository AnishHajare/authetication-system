import config from "../config/config.js";
import AppError from "../utils/app-error.js";

const requestStore = new Map();

function pruneExpiredEntries(now) {
  for (const [key, entry] of requestStore.entries()) {
    if (entry.resetAt <= now) {
      requestStore.delete(key);
    }
  }
}

export function rateLimit(label) {
  return function rateLimited(req, res, next) {
    const now = Date.now();
    pruneExpiredEntries(now);

    const key = `${label}:${req.ip}`;
    const current = requestStore.get(key);

    if (!current || current.resetAt <= now) {
      requestStore.set(key, {
        count: 1,
        resetAt: now + config.RATE_LIMIT_WINDOW_MS,
      });

      return next();
    }

    if (current.count >= config.RATE_LIMIT_MAX_REQUESTS) {
      return next(
        new AppError(429, "Too many requests. Please try again later."),
      );
    }

    current.count += 1;
    requestStore.set(key, current);

    return next();
  };
}

export function resetRateLimitStore() {
  requestStore.clear();
}
