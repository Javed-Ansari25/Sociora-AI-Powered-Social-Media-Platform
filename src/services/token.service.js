import jwt from 'jsonwebtoken';

export const tokenService = {
  generateAccessToken: (user) => {
    return jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '30m',
      },
    );
  },

  generateRefreshToken: (user) => {
    return jwt.sign(
      {
        userId: user._id.toString(),
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
      },
    );
  },

  verifyAccessToken: (token) => {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  },

  verifyRefreshToken: (token) => {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  },

  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  },
};
