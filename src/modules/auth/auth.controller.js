import { tokenService } from '../../services/token.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authService } from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body;

  const result = await authService.register({ name, username, email, password });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        result,
        'User registered successfully. OTP sent, please verify your email.',
      ),
    );
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  await authService.verifyEmail({ email, otp });

  res.status(200).json(new ApiResponse(200, null, 'Email verified successfully.'));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login({ email, password });

  res
    .cookie('refreshToken', result.refreshToken, tokenService.getRefreshTokenCookieOptions())
    .cookie('accessToken', result.accessToken, tokenService.getAccessTokenCookieOptions())
    .status(200)
    .json(new ApiResponse(200, result.user, 'User logged in successfully.'));
});

export const logout = asyncHandler(async (req, res) => {
  // userId comes from the authenticated request (auth middleware sets
  // req.user), never from req.body — otherwise anyone could log out any account
  const userId = req.user._id;

  await authService.logout({ userId });

  res
    .clearCookie('refreshToken', tokenService.getRefreshTokenCookieOptions())
    .clearCookie('accessToken', tokenService.getAccessTokenCookieOptions())
    .status(200)
    .json(new ApiResponse(200, null, 'User logged out successfully.'));
});

export const refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  const result = await authService.refreshToken({ refreshToken });

  res
    .cookie('refreshToken', result.refreshToken, tokenService.getRefreshTokenCookieOptions())
    .cookie('accessToken', result.accessToken, tokenService.getAccessTokenCookieOptions())
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken: result.accessToken },
        'Access token refreshed successfully.',
      ),
    );
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await authService.forgotPassword({ email });

  // no userId forwarded here — that would leak whether the email is registered
  res.status(200).json(new ApiResponse(200, null, result.message));
});

export const verifyForgotPasswordOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const result = await authService.verifyForgotPasswordOTP({ email, otp });

  res.cookie('passwordResetToken', result.resetToken, {
    ...tokenService.cookieOptions,
    maxAge: result.expiresIn * 1000,
  });

  res
    .status(200)
    .json(new ApiResponse(200, { expiresIn: result.expiresIn }, 'OTP verified successfully.'));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const resetToken = req.cookies?.passwordResetToken;

  const result = await authService.resetPassword({ resetToken, newPassword });

  res.clearCookie('passwordResetToken', tokenService.cookieOptions);

  res.status(200).json(new ApiResponse(200, null, result.message));
});

export const changePassword = asyncHandler(async (req, res) => {
  // was `const { userId } = req.user._id` — destructuring "userId" off an
  // ObjectId always gives undefined
  const userId = req.user._id;
  const { currentPassword, newPassword } = req.body;

  const result = await authService.changePassword({ userId, currentPassword, newPassword });

  res.status(200).json(new ApiResponse(200, null, result.message));
});