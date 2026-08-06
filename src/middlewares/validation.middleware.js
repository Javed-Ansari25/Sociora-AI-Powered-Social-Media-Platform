import { ApiError } from '../utils/apiError.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(', ');
    throw new ApiError(400, message);
  }

  req.body = result.data;
  next();
};