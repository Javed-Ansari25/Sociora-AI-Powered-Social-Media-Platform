import { Queue } from "bullmq";
import redisClient from "../config/redis.js";

export const emailQueue = new Queue("email", {
  connection:  redisClient,
});
