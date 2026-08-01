import { tokenService } from '../services/token.service.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import User from '../modules/users/user.model.js';

export const authenticate = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if (!token) {
            throw new ApiError(401, "UnAuthorization error")
        }

        // const isBlacklisted = await redisClient.get(`bl:${token}`);
        // if (isBlacklisted) {
        //     throw new ApiError(401, "Token expired");
        // }
            
        const decoded = tokenService.verifyAccessToken(token);
        const user = await User.findById(decoded.userId);
    
        if(!user) {
            throw new ApiError(401, "Invalid access token");
        }
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
})