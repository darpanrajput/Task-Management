import { Worker } from "bullmq";
import User from "../models/User.js";
import Task from "../models/Task.js";
import TaskEligibility from "../models/TaskEligibility.js";
import redisClient from "../config/redis.js";
import dotenv from "dotenv";

dotenv.config();

let eligibilityWorker = null;


export async function initializeWorker() {
    if (eligibilityWorker) return eligibilityWorker;

    eligibilityWorker = new Worker("eligibility", async (job) => {
        console.log(`Processing job ${job.id}:`, job.data);

        const { taskId, recomputeAll } = job.data;

        try {
            if (recomputeAll) {

                const tasks = await Task.find();

                for (const task of tasks) {
                    await computeEligibilityForTask(task);
                }
            } else {

                const task = await Task.findById(taskId);
                if (task) {
                    await computeEligibilityForTask(task);
                }
            }

            console.log(`Job ${job.id} completed successfully`);
            return { success: true, message: "Eligibility computed" };
        } catch (error) {
            console.error(`Job ${job.id} failed:`, error);
            throw error;
        }
    }, { connection: redisClient });

    eligibilityWorker.on("completed", (job) => {
        console.log(`✅ Job ${job.id} completed`);
    });

    eligibilityWorker.on("failed", (job, err) => {
        console.error(`❌ Job ${job.id} failed:`, err.message);
    });

    console.log("✅ Eligibility Worker initialized");
    return eligibilityWorker;

    async function computeEligibilityForTask(task) {
        const { _id: taskId, rules } = task;


        await TaskEligibility.deleteMany({ taskId });


        const query = {};

        if (rules.department) {
            query.department = rules.department;
        }

        if (rules.minExperience !== undefined) {
            query.experienceYears = { $gte: rules.minExperience };
        }

        if (rules.maxActiveTasks !== undefined) {
            query.activeTaskCount = { $lte: rules.maxActiveTasks };
        }

        if (rules.location) {
            query.location = rules.location;
        }

        const eligibleUsers = await User.find(query);

        const eligibilityRecords = eligibleUsers.map((user) => ({
            taskId: taskId,
            userId: user._id,
            isEligible: true,
            computedAt: new Date()
        }));

        if (eligibilityRecords.length > 0) {
            await TaskEligibility.insertMany(eligibilityRecords);
        }

        // Invalidate read cache so next API read refreshes with latest eligibility rows.
        const cacheKey = `eligible_users:${taskId}`;
        await redisClient.del(cacheKey);

        console.log(`Computed eligibility for task ${taskId}: ${eligibleUsers.length} users`);
    }
}
export default { initializeWorker }
