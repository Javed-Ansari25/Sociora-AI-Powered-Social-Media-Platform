import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import redisClient from '../config/redis.js';

// Keep this in sync with process.env.REFRESH_TOKEN_EXPIRY below (default '7d').
// jsonwebtoken accepts a string ('7d') for signing; Redis TTL needs seconds,
// so we keep a numeric mirror of the same duration here.
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const ACCESS_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min, mirrors ACCESS_TOKEN_EXPIRY default

const baseCookieOptions = {
  httpOnly: true,
  secure: true, // requires HTTPS — with sameSite:'none' this is mandatory or browsers drop the cookie
  sameSite: 'none',
};

export const tokenService = {
  generateAccessToken: (user) => {
    return jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '30m' },
    );
  },

  generateRefreshToken: (user) => {
    return jwt.sign(
      { userId: user._id.toString() },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' },
    );
  },

  verifyAccessToken: (token) => {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  },

  verifyRefreshToken: (token) => {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  },

  /**
   * Persists a refresh token so it can later be validated/revoked.
   * Stored hashed (like a password) so a Redis leak alone doesn't hand out
   * usable tokens. One active refresh token per user — a new login/refresh
   * overwrites the previous one, which naturally logs out other sessions.
   * If you want multi-device sessions, key this by `refreshToken:${userId}:${deviceId}` instead.
   */
  storeRefreshToken: async (userId, refreshToken) => {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await redisClient.set(`refreshToken:${userId}`, hashed, 'EX', REFRESH_TOKEN_TTL_SECONDS);
  },

  isRefreshTokenValid: async (userId, refreshToken) => {
    const stored = await redisClient.get(`refreshToken:${userId}`);
    if (!stored) return false;
    return bcrypt.compare(refreshToken, stored);
  },

  revokeRefreshToken: async (userId) => {
    await redisClient.del(`refreshToken:${userId}`);
  },

  // Generic fallback (kept for backward compatibility with existing calls)
  cookieOptions: baseCookieOptions,

  getAccessTokenCookieOptions: () => ({
    ...baseCookieOptions,
    maxAge: ACCESS_TOKEN_TTL_MS,
  }),

  getRefreshTokenCookieOptions: () => ({
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  }),
};