import ApiError from "../utils/ApiError.js";

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "Access denied");
    }
    next();
  };
};

export default authorize;
