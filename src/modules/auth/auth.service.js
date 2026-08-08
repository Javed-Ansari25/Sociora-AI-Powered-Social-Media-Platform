import User from '../users/user.model.js';
import redisClient from '../../config/redis.js';

import bcrypt from 'bcrypt';
import crypto from 'crypto';

import { ApiError } from '../../utils/apiError.js';
import { tokenService } from '../../services/token.service.js';
import { emailQueue } from '../../queues/email.queue.js';
import { generateOTP } from '../../utils/otp.js';

import {
  MAX_LOGIN_ATTEMPTS,
  LOGIN_LOCK_WINDOW,
  OTP_EXPIRY,
  MAX_OTP_ATTEMPTS,
  FORGOT_PASSWORD_LIMIT,
  FORGOT_PASSWORD_WINDOW,
  RESET_TOKEN_EXPIRY,
} from './auth.constants.js';

/**
 * Password hashing: NEVER done manually here. The User schema's pre('save')
 * hook hashes it automatically whenever `password` is modified. Always pass
 * the PLAIN password to User.create()/user.save().
 *
 * Password comparison: uses the schema's `user.comparePassword()` method
 * instead of calling bcrypt directly, so the hashing algorithm only needs
 * to be known in one place (the model).
 *
 * Refresh tokens: NOT stored on the User document. tokenService persists
 * them in Redis (hashed) and can validate/revoke them independently of Mongo.
 *
 * Email normalization: routes are expected to run this through the Zod
 * validators (which lowercase/trim email via .transform()) before it ever
 * reaches here. The .toLowerCase().trim() calls below are a defensive
 * second layer in case this service is ever called from somewhere that
 * skips the validation middleware (a script, a job, etc).
 */

export const authService = {
  // REGISTER
  register: async ({ name, username, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.toLowerCase().trim();

  let user;

  try {
    // Fast existence check
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername },
      ],
    }).lean();

    if (existingUser) {
      throw new ApiError(400, 'Email or username already exists');
    }

    // Password is hashed by mongoose pre-save hook
    user = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password,
    });

    const otp = generateOTP();

    const otpHashRounds = Number(process.env.OTP_HASH_ROUNDS || 10);
    const hashedOtp = await bcrypt.hash(otp, otpHashRounds);

    // These operations are independent after user creation
    await Promise.all([
      redisClient.set(
        `otp:${user._id}`,
        hashedOtp,
        'EX',
        OTP_EXPIRY
      ),

      emailQueue.add(
        'sendEmailOTP',
        {
          userId: user._id.toString(),
          email: user.email,
          otp,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      ),
    ]);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    };
  } catch (error) {
    // Mongo duplicate key (race condition)
    if (error?.code === 11000) {
      throw new ApiError(400, 'Email or username already exists');
    }

    // Cleanup Redis OTP if it was stored
    if (user?._id) {
      try {
        await redisClient.del(`otp:${user._id}`);
      } catch (_) {}
    }

    throw error;
  }
},

  // VERIFY EMAIL (post-registration OTP)
  verifyEmail: async ({ email, otp }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  const otpKey = `otp:${user._id}`;

  const storedOtp = await redisClient.get(otpKey);

  if (!storedOtp) {
    throw new ApiError(400, "OTP has expired or is invalid");
  }

  const isValidOtp = await bcrypt.compare(otp, storedOtp);

  if (!isValidOtp) {
    throw new ApiError(400, "Invalid OTP");
  }

  await User.updateOne(
  { _id: user._id },
  {
    $set: {
      isEmailVerified: true,
      isActive: true,
    },
  }
);

await redisClient.del(`otp:${user._id}`);

  return {
    message: "Email verified successfully.",
  };
},

  // LOGIN
  login: async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.isBlocked) {
    throw new ApiError(
      403,
      "Your account has been blocked. Contact support."
    );
  }

  if (!user.isActive || !user.isEmailVerified) {
    throw new ApiError(
      403,
      "User account is not verified. Please verify your email."
    );
  }

  const attemptsKey = `loginAttempts:${user._id}`;

  const currentAttempts =
    Number(await redisClient.get(attemptsKey)) || 0;

  if (currentAttempts >= MAX_LOGIN_ATTEMPTS) {
    const ttl = await redisClient.ttl(attemptsKey);

    throw new ApiError(
      429,
      `Too many login attempts. Try again in ${Math.max(
        1,
        Math.ceil(ttl / 60)
      )} minute(s).`
    );
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    const attempts = await redisClient.incr(attemptsKey);

    if (attempts === 1) {
      await redisClient.expire(
        attemptsKey,
        LOGIN_LOCK_WINDOW
      );
    }

    throw new ApiError(
      401,
      "Invalid email or password"
    );
  }

  // Password correct
  // Clear attempts + generate tokens together
  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = tokenService.generateRefreshToken(user);

  await Promise.all([
    redisClient.del(attemptsKey),
    tokenService.storeRefreshToken(
      user._id,
      refreshToken
    ),
  ]);

  // Don't block response
  User.updateOne(
    { _id: user._id },
    {
      $set: {
        lastLoginAt: new Date(),
      },
    }
  ).catch((err) => {
    console.error("Last login update failed:", err);
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
},

  // LOGOUT
  logout: async ({ userId }) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    await tokenService.revokeRefreshToken(userId);

    return { message: 'User logged out successfully.' };
  },

  // REFRESH ACCESS TOKEN
  refreshToken: async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  let decoded;

  try {
    decoded = tokenService.verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // Run independent operations together
  const [user, isValidToken] = await Promise.all([
    User.findById(decoded.userId).select(
      "_id name email role isBlocked isActive isEmailVerified"
    ),
    tokenService.isRefreshTokenValid(
      decoded.userId,
      refreshToken
    ),
  ]);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isBlocked) {
    throw new ApiError(
      403,
      "Your account has been blocked. Contact support."
    );
  }

  if (!user.isActive || !user.isEmailVerified) {
    throw new ApiError(
      403,
      "User account is not active."
    );
  }

  if (!isValidToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const newAccessToken =
    tokenService.generateAccessToken(user);

  const newRefreshToken =
    tokenService.generateRefreshToken(user);

  await tokenService.storeRefreshToken(
    user._id,
    newRefreshToken
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
},

  // FORGOT PASSWORD — request OTP
  forgotPassword: async ({ email }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const rateLimitKey = `forgotPasswordRate:${normalizedEmail}`;

  const requestCount = await redisClient.incr(rateLimitKey);

  if (requestCount === 1) {
    await redisClient.expire(
      rateLimitKey,
      FORGOT_PASSWORD_WINDOW
    );
  }

  if (requestCount > FORGOT_PASSWORD_LIMIT) {
    throw new ApiError(
      429,
      "Too many password reset requests. Please try again later."
    );
  }

  const user = await User.findOne({
    email: normalizedEmail,
  })
    .select("_id email")
    .lean();

  // Prevent user enumeration
  if (!user) {
    return {
      message:
        "If an account exists with this email, an OTP has been sent.",
    };
  }

  const otp = generateOTP();

  const hashedOtp = await bcrypt.hash(
    otp,
    Number(process.env.OTP_HASH_ROUNDS || 10)
  );

  const otpKey = `forgotPasswordOtp:${user._id}`;

  await Promise.all([
    redisClient.set(
      otpKey,
      hashedOtp,
      "EX",
      OTP_EXPIRY
    ),

    redisClient.del(
      `forgotPasswordAttempts:${user._id}`
    ),

    emailQueue.add(
      "sendForgotPasswordOTP",
      {
        userId: user._id.toString(),
        email: user.email,
        otp,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    ),
  ]);

  return {
    message:
      "If an account exists with this email, an OTP has been sent.",
  };
},

  // VERIFY FORGOT-PASSWORD OTP
  verifyForgotPasswordOTP: async ({ email, otp }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: normalizedEmail,
  })
    .select("_id")
    .lean();

  if (!user) {
    throw new ApiError(400, "Invalid OTP.");
  }

  const otpKey = `forgotPasswordOtp:${user._id}`;
  const attemptsKey = `forgotPasswordAttempts:${user._id}`;

  // Both Redis reads are independent
  const [storedOtp, attemptsValue] = await Promise.all([
    redisClient.get(otpKey),
    redisClient.get(attemptsKey),
  ]);

  if (!storedOtp) {
    throw new ApiError(400, "OTP has expired or is invalid.");
  }

  const attempts = Number(attemptsValue) || 0;

  if (attempts >= MAX_OTP_ATTEMPTS) {
    await Promise.all([
      redisClient.del(otpKey),
      redisClient.del(attemptsKey),
    ]);

    throw new ApiError(
      429,
      "Too many invalid OTP attempts. Please request a new OTP."
    );
  }

  const isValidOtp = await bcrypt.compare(otp, storedOtp);

  if (!isValidOtp) {
    const newAttempts = await redisClient.incr(attemptsKey);

    if (newAttempts === 1) {
      await redisClient.expire(attemptsKey, OTP_EXPIRY);
    }

    if (newAttempts >= MAX_OTP_ATTEMPTS) {
      await Promise.all([
        redisClient.del(otpKey),
        redisClient.del(attemptsKey),
      ]);

      throw new ApiError(
        429,
        "Too many invalid OTP attempts. Please request a new OTP."
      );
    }

    throw new ApiError(400, "Invalid OTP.");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const hashedResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const resetTokenKey = `passwordResetToken:${hashedResetToken}`;

  // Store reset token & cleanup OTP together
  await Promise.all([
    redisClient.set(
      resetTokenKey,
      user._id.toString(),
      "EX",
      RESET_TOKEN_EXPIRY
    ),
    redisClient.del(otpKey),
    redisClient.del(attemptsKey),
  ]);

  return {
    resetToken,
    expiresIn: RESET_TOKEN_EXPIRY,
  };
},

  // RESET PASSWORD
  resetPassword: async ({ resetToken, newPassword }) => {
  if (!resetToken) {
    throw new ApiError(400, "Reset token is missing.");
  }

  const hashedResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const resetTokenKey = `passwordResetToken:${hashedResetToken}`;

  const userId = await redisClient.get(resetTokenKey);

  if (!userId) {
    throw new ApiError(400, "Reset token is invalid or expired.");
  }

  const user = await User.findById(userId).select("+password");

  if (!user) {
    // Cleanup orphan token
    await redisClient.del(resetTokenKey);
    throw new ApiError(404, "User not found.");
  }

  user.password = newPassword;

  // Password gets hashed by mongoose pre-save hook
  await user.save();

  // Cleanup token & revoke refresh token together
  await Promise.all([
    redisClient.del(resetTokenKey),
    tokenService.revokeRefreshToken(user._id),
  ]);

  return {
    message: "Password reset successfully.",
  };
},

  // CHANGE PASSWORD (logged-in user)
  changePassword: async ({ userId, currentPassword, newPassword }) => {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new ApiError(401, 'Current password is incorrect.');
    }

    user.password = newPassword;
    await user.save();

    // force re-login on other sessions after a password change
    await tokenService.revokeRefreshToken(user._id);

    return { message: 'Password changed successfully.' };
  },
};
