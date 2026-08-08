// import { Router } from "express";
// import { register, login, verifyEmail, logout, refreshToken, forgotPassword, verifyForgotPasswordOTP, resetPassword,
//     changePassword 
//   } from "./auth.controller.js";
// import { authenticate } from "../../middlewares/auth.middleware.js";
// import { validate } from "../../middlewares/validation.middleware.js";
// import { registerSchema,loginSchema, emailSchema, verifyForgotPasswordOTPSchema, resetPasswordSchema, changePasswordSchema } from "./auth.validation.js";

// const router = Router();

// // Route declaration
// router.post("/register", validate(registerSchema), register);
// router.post("/verify-email", validate(emailSchema), verifyEmail);

// router.post("/login", validate(loginSchema), login);
// router.post("/logout", authenticate, logout);
// router.post("/refresh-token", refreshToken);  

// router.post("/forgot-password", validate(emailSchema), forgotPassword);
// router.post("/forgot-password/verify", validate(verifyForgotPasswordOTPSchema), verifyForgotPasswordOTP);
// router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// router.post("/change-password", authenticate, validate(changePasswordSchema), changePassword);

// export default router;


import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  logout,
  refreshToken,
  forgotPassword,
  verifyForgotPasswordOTP,
  resetPassword,
  changePassword,
} from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { authRateLimiter, strictAuthRateLimiter } from '../../middlewares/rateLimit.middleware.js';
import {
  registerSchema,
  loginSchema,
  emailSchema,
  verifyEmailSchema,
  verifyForgotPasswordOTPSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.validation.js';

const router = Router();
// Apply the auth rate limiter to all /auth routes 
router.use(authRateLimiter);

// Registration & verification 
router.post('/register', strictAuthRateLimiter, validate(registerSchema), register);
router.post('/email/verify', validate(verifyEmailSchema), verifyEmail);

//Session 
router.post('/login', strictAuthRateLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/token/refresh', strictAuthRateLimiter, refreshToken);

// Password recovery 
router.post('/password/forgot', strictAuthRateLimiter, validate(emailSchema), forgotPassword);
router.post(
  '/password/forgot/verify',
  strictAuthRateLimiter,
  validate(verifyForgotPasswordOTPSchema),
  verifyForgotPasswordOTP,
);
router.post('/password/reset', strictAuthRateLimiter, validate(resetPasswordSchema), resetPassword);
router.patch('/password/change', authenticate, validate(changePasswordSchema), changePassword);

export default router;
