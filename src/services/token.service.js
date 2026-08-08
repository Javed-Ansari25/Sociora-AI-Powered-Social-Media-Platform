import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import redisClient from '../config/redis.js';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days — keep in sync with REFRESH_TOKEN_EXPIRY below
const ACCESS_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min

const baseCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
};


const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const constantTimeEqual = (a, b) => {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
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

  storeRefreshToken: async (userId, refreshToken) => {
    const hashed = hashToken(refreshToken); // was: await bcrypt.hash(refreshToken, 10)
    await redisClient.set(`refreshToken:${userId}`, hashed, 'EX', REFRESH_TOKEN_TTL_SECONDS);
  },

  isRefreshTokenValid: async (userId, refreshToken) => {
    const stored = await redisClient.get(`refreshToken:${userId}`);
    if (!stored) return false;
    return constantTimeEqual(stored, hashToken(refreshToken)); // was: await bcrypt.compare(...)
  },

  revokeRefreshToken: async (userId) => {
    await redisClient.del(`refreshToken:${userId}`);
  },

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