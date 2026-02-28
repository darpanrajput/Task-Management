import TaskEligibility from "../models/TaskEligibility.js";
import redisClient from "../config/redis.js";
import { eligibilityQueue } from "../config/queue.js";

export async function getEligibleUsers(taskId) {
    try {

        const cacheKey = `eligible_users:${taskId}`;
        const cached = await redisClient.get(cacheKey);

        if (cached) {
            console.log(`Cache hit for task ${taskId}`);
            return JSON.parse(cached);
        }


        const eligibleUsers = await TaskEligibility.find({
            taskId,
            isEligible: true
        }).populate("userId", "name email department");


        await redisClient.setEx(cacheKey, 1800, JSON.stringify(eligibleUsers));

        return eligibleUsers;
    } catch (error) {
        console.error("Error fetching eligible users:", error);
        throw error;
    }
}

export async function queueEligibilityComputation(taskId) {
    try {
        const job = await eligibilityQueue.add(
            "compute-eligibility",
            { taskId, recomputeAll: false },
            {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 2000
                },
                removeOnComplete: true
            }
        );

        console.log(`Queued eligibility computation for task ${taskId} (Job ID: ${job.id})`);
        return job;
    } catch (error) {
        console.error("Error queuing eligibility computation:", error);
        throw error;
    }
}

export async function queueFullRecomputation() {
    try {
        const job = await eligibilityQueue.add(
            "recompute-all-eligibility",
            { taskId: null, recomputeAll: true },
            {
                attempts: 2,
                removeOnComplete: true
            }
        );

        console.log(`Queued full recomputation (Job ID: ${job.id})`);

        // Invalidate all caches
        const keys = await redisClient.keys("eligible_users:*");
        if (keys.length > 0) {
            await redisClient.del(keys);
        }

        return job;
    } catch (error) {
        console.error("Error queuing full recomputation:", error);
        throw error;
    }
}

export async function clearEligibilityCache(taskId) {
    try {
        const cacheKey = `eligible_users:${taskId}`;
        await redisClient.del(cacheKey);
        console.log(`Cache cleared for task ${taskId}`);
    } catch (error) {
        console.error("Error clearing cache:", error);
        throw error;
    }
}