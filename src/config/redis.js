import dotenv from 'dotenv';
dotenv.config();

import Redis from "ioredis"

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,

  maxRetriesPerRequest: null, // Disable max retries per request
});

redisClient.on("connect", () => {
  console.log("Redis connected");
})

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

export default redisClient
