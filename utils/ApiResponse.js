// ── Success Response ──────────────────────────────────────
const successResponse = (res, { statusCode = 200, message = "Success", data = null }) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

// ── Error Response ────────────────────────────────────────
const errorResponse = (res, { statusCode = 500, message = "Internal Server Error", errors = null }) => {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

// ── Async wrapper (no try-catch boilerplate in controllers) 
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { successResponse, errorResponse, asyncHandler };