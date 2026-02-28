import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.REDIS_URL) {
    throw new Error("Missing REDIS_URL environment variable.");
}

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on("error", (err) => console.error("Redis Error:", err));
redisClient.on("connect", () => console.log("Redis Connected"));

await redisClient.connect();

export default redisClient;
