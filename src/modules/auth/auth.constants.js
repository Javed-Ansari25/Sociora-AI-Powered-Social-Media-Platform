// ==== Login security ====
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_WINDOW = 15 * 60; // seconds (15 min) — TTL on the attempts counter

// ==== Email verification OTP ====
export const OTP_EXPIRY = 5 * 60; // seconds
export const MAX_OTP_ATTEMPTS = 5;

// ==== Forgot password flow ====
export const FORGOT_PASSWORD_LIMIT = 3; // max requests per window
export const FORGOT_PASSWORD_WINDOW = 60 * 60; // seconds (1 hour)
export const RESET_TOKEN_EXPIRY = 15 * 60; // seconds

// NOTE: token.service.js also has its own REFRESH_TOKEN_TTL_SECONDS (7 days)
// used for the Redis-stored refresh token — keep both in sync with
// process.env.REFRESH_TOKEN_EXPIRY if you ever change it.