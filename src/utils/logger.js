function log(level, message, meta = {}) {
  const payload = {
    level,
    message,
    ...meta,
    timestamp: new Date().toISOString(),
  };

  console[level === "error" ? "error" : "log"](JSON.stringify(payload));
}

export const logger = {
  info(message, meta) {
    log("info", message, meta);
  },
  error(message, meta) {
    log("error", message, meta);
  },
};
