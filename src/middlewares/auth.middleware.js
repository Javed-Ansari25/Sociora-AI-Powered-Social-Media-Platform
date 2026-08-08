import { tokenService } from '../services/token.service.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import User from '../modules/users/user.model.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new ApiError(401, 'Unauthorized');
    }

    const decoded = tokenService.verifyAccessToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new ApiError(401, 'Invalid access token');
    }

    // fixed: a valid access token issued before a block/ban shouldn't keep
    // working until it expires — check current status on every request
    if (user.isBlocked) {
      throw new ApiError(403, 'Your account has been blocked. Contact support.');
    }

    req.user = user;
    next();
  } catch (error) {
    // jwt.verify throws its own errors (TokenExpiredError, JsonWebTokenError) —
    // normalize everything to a 401 ApiError here
    throw new ApiError(401, error?.message || 'Invalid access token');
  }
});