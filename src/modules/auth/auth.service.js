import User from "../users/user.model";
import bcrypt from "bcryptjs";
import { ApiError } from "../../utils/apiError";
import { tokenService } from "../../services/token.service";
import { sendEmailOTP } from "../../services/email.service";
import { generateOTP } from "../../utils/otp";
import redisClient from "../../config/redis";
import { MAX_LOGIN_ATTEMPTS } from "./auth.constants";

export const authService = {
    // register Service
    register : async ({ name, email, password }) => {
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            throw new ApiError(400, "Email already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword });

        const otp = generateOTP();
        redisClient.set(`otp:${user._id}`, otp, 'EX', 5 * 60); // Store OTP in Redis with 5 minutes expiry

        return {
            user : {
                id: user._id,
                name: user.name,
                email: user.email
            }
        }
    }
}
