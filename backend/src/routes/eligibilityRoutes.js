import express from "express";
import {
    getEligibleUsers,
    queueEligibilityComputation,
    queueFullRecomputation,
    clearEligibilityCache
} from "../services/eligibilityService.js";
import validateInputs from "../middlewares/validateInputs.js";

const router = express.Router();

router.use(validateInputs);

/**
 * GET /api/eligibility/:taskId
 * Get eligible users for a task (with caching)
 */
router.get("/:taskId", async (req, res) => {
    try {
        const { taskId } = req.params;
        const eligibleUsers = await getEligibleUsers(taskId);

        res.json({
            success: true,
            data: eligibleUsers,
            count: eligibleUsers.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/eligibility/:taskId/recompute
 * Queue eligibility recomputation for a specific task
 */
router.post("/:taskId/recompute", async (req, res) => {
    try {
        const { taskId } = req.params;
        const job = queueEligibilityComputation(taskId);

        res.json({
            success: true,
            message: "Eligibility recomputation queued",
            jobId: job.id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/eligibility/recompute-all
 * Queue full system recomputation
 */
router.post("/recompute-all", async (req, res) => {
    try {
        const job = await queueFullRecomputation();

        res.json({
            success: true,
            message: "Full recomputation queued",
            jobId: job.id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/eligibility/:taskId/cache
 * Clear cache for a specific task
 */
router.delete("/:taskId/cache", async (req, res) => {
    try {
        const { taskId } = req.params;
        await clearEligibilityCache(taskId);

        res.json({
            success: true,
            message: "Cache cleared"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
