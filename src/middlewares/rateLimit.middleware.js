import redisClient from '../config/redis.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Factory for Redis-backed IP rate limiters.
 *
 * Uses this fixed-window pattern:
 *   INCR key -> if it's the first hit, set an EXPIRE (the window) ->
 *   if count exceeds max, reject with a Retry-After header.
 *
 * `prefix` MUST be unique per limiter instance — reusing a prefix across
 * two limiters makes them share the same counter and silently breaks both
 * (this was the bug in the original code: both functions used `rate:`).
 *
 * IMPORTANT: `req.ip` only reflects the real client IP if your app trusts
 * the reverse proxy in front of it. In your main app entrypoint, set:
 *   app.set('trust proxy', 1);
 * (adjust the number to how many proxies/load balancers sit in front of you)
 * Without this, everyone behind your LB/Nginx looks like the same IP and
 * gets rate-limited together.
 */
const createRateLimiter = ({ windowSeconds, maxRequests, prefix, failOpen = true }) => {
  return async (req, res, next) => {
    try {
      const ip =
        req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

      const key = `${prefix}:${ip}`;

      const requests = await redisClient.incr(key);

      if (requests === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      if (requests > maxRequests) {
        const ttl = await redisClient.ttl(key);
        const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;

        res.set('Retry-After', String(retryAfterSeconds));
        throw new ApiError(
          429,
          `Too many requests. Try again in ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minute(s).`,
        );
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error);
      }

      // Redis itself failed (connection drop, timeout, etc) — log it, and
      // by default fail OPEN so a Redis hiccup doesn't take down the whole
      // API. Set failOpen: false on a specific limiter if you'd rather be
      // strict (e.g. for something extremely abuse-prone).
      console.error('Rate limiter error:', error);
      return failOpen ? next() : next(error);
    }
  };
};

// Applied app-wide (e.g. in app.js as `app.use(globalRateLimiter)`) —
// a generous ceiling just to blunt obvious abuse/DoS-style traffic.
export const globalRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 500,
  prefix: 'rate:global',
});

// Applied to the whole /auth router — tighter than global since auth
// endpoints are more sensitive than the average API route.
export const authRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 30,
  prefix: 'rate:auth',
});

// Applied to specific high-risk routes: login, register, refresh-token,
// forgot-password flow. This is on top of the per-account Redis lockouts
// already in auth.service.js — this one caps by IP instead of by account.
export const strictAuthRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 5,
  prefix: 'rate:auth:strict',
});