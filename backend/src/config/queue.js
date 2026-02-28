import { Queue } from "bullmq";
import redisClient from "./redis.js";
import dotenv from "dotenv";

dotenv.config();

export const eligibilityQueue = new Queue("eligibility", { connection: redisClient });

export default eligibilityQueue;
