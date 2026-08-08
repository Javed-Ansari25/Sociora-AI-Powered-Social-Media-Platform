import { z } from 'zod';

const emailField = z
  .string()
  .trim()
  .email('Please provide a valid email')
  .transform((val) => val.toLowerCase());

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name cannot exceed 50 characters'),

  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .toLowerCase(),

  email: emailField,

  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password cannot exceed 100 characters'),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const emailSchema = z.object({
  email: emailField,
});


export const verifyEmailSchema = z.object({
  email: emailField,
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export const verifyForgotPasswordOTPSchema = z.object({
  email: emailField,
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(128, 'New password must not exceed 128 characters'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });


export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1).optional(),
});
