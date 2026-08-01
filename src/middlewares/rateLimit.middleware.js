import redisClient from "../config/redis.js";

const optRatelimit = async (req, res, next) => {
    try {
        const ip = req.ip;
        const key = `rate:${ip}`;

        const request = await redisClient.incr(key);

        if (request == 1) {
            await redisClient.expire(key, 60); // 1 min window
        }

        if (request >= 5) {
            return res.status(429).json({ message: "Too many requests, try again after 1 Minute" });
        }

        next();
    } catch (error) {
        next(error)
    }
}


const globalRateLimiter = async (req, res, next) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const key = `rate:${ip}`;

    const requests = await redisClient.incr(key);

    // first request → set expiry
    if (requests === 1) {
      await redisClient.expire(key, 60); // 60 sec window
    }

    // limit exceed
    if (requests > 500) {
      return res.status(429).json({
        success: false,
        message: "Too many requests, try again after 1 minute",
      });
    }

    next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    next(); 
  }
};

export {optRatelimit, globalRateLimiter}
