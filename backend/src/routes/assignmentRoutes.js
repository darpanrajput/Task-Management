import express from "express";
import {
    assignTaskAtomically,
    reassignTaskAtomically,
    completeTaskAtomically
} from "../services/assignmentService.js";
import validateInputs from "../middlewares/validateInputs.js";
import { protect } from "../middlewares/authMiddleware.js";
import Task from "../models/Task.js";
import TaskEligibility from "../models/TaskEligibility.js";
import User from "../models/User.js";

const router = express.Router();

router.use(validateInputs);

function getEligibilityMismatchReasons(task, user) {
    const reasons = [];
    const rules = task?.rules || {};

    if (rules.department && user?.department !== rules.department) {
        reasons.push(`Department mismatch: required "${rules.department}", user has "${user?.department || "Not specified"}"`);
    }

    if (rules.minExperience !== undefined) {
        const userExperience = Number(user?.experienceYears || 0);
        if (userExperience < Number(rules.minExperience)) {
            reasons.push(`Experience requirement not met: minimum ${rules.minExperience} year(s), user has ${userExperience} year(s)`);
        }
    }

    if (rules.maxActiveTasks !== undefined) {
        const activeCount = Number(user?.activeTaskCount || 0);
        if (activeCount > Number(rules.maxActiveTasks)) {
            reasons.push(`Capacity exceeded: maximum ${rules.maxActiveTasks} active task(s), user currently has ${activeCount}`);
        }
    }

    if (rules.location && user?.location !== rules.location) {
        reasons.push(`Location mismatch: required "${rules.location}", user has "${user?.location || "Not specified"}"`);
    }

    return reasons;
}

/**
 * POST /api/assignments/:taskId/assign
 * Atomically assign a task to a user
 */
router.post("/:taskId/assign", protect, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { userId, reason, forceAssign } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "userId is required"
            });
        }

        // Authorization: only Admin or the task creator may assign
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ success: false, error: "Task not found" });
        }

        if (req.user.role !== "Admin" && String(task.createdBy) !== String(req.user.id)) {
            return res.status(403).json({ success: false, error: "Not allowed to assign this task" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const mismatchReasons = getEligibilityMismatchReasons(task, user);

        // Check eligibility if record exists
        const eligibility = await TaskEligibility.findOne({ taskId, userId });
        const isIneligible = mismatchReasons.length > 0 || (eligibility && !eligibility.isEligible);

        if (isIneligible) {
            if (!(req.user.role === "Admin" && forceAssign === true)) {
                return res.status(409).json({
                    success: false,
                    code: "USER_NOT_ELIGIBLE",
                    error: "User is not eligible for this task",
                    reasons: mismatchReasons.length ? mismatchReasons : ["Eligibility criteria not met"],
                    canForceAssign: req.user.role === "Admin"
                });
            }
        }

        const auditReason = reason || "Task assigned";
        const finalReason = isIneligible
            ? `${auditReason} (forced by admin despite eligibility mismatch)`
            : auditReason;

        const result = await assignTaskAtomically(taskId, userId, finalReason);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/assignments/:taskId/reassign
 * Atomically reassign a task to a different user
 */
router.post("/:taskId/reassign", protect, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { newUserId, reason, forceAssign } = req.body;

        if (!newUserId) {
            return res.status(400).json({
                success: false,
                error: "newUserId is required"
            });
        }

        // Authorization: only Admin or the task creator may reassign
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ success: false, error: "Task not found" });
        }

        if (req.user.role !== "Admin" && String(task.createdBy) !== String(req.user.id)) {
            return res.status(403).json({ success: false, error: "Not allowed to reassign this task" });
        }

        const user = await User.findById(newUserId);
        if (!user) {
            return res.status(404).json({ success: false, error: "New user not found" });
        }

        const mismatchReasons = getEligibilityMismatchReasons(task, user);

        // Check eligibility
        const eligibility = await TaskEligibility.findOne({ taskId, userId: newUserId });
        const isIneligible = mismatchReasons.length > 0 || (eligibility && !eligibility.isEligible);

        if (isIneligible) {
            if (!(req.user.role === "Admin" && forceAssign === true)) {
                return res.status(409).json({
                    success: false,
                    code: "USER_NOT_ELIGIBLE",
                    error: "User is not eligible for this task",
                    reasons: mismatchReasons.length ? mismatchReasons : ["Eligibility criteria not met"],
                    canForceAssign: req.user.role === "Admin"
                });
            }
        }

        const auditReason = reason || "Task reassigned";
        const finalReason = isIneligible
            ? `${auditReason} (forced by admin despite eligibility mismatch)`
            : auditReason;

        const result = await reassignTaskAtomically(taskId, newUserId, finalReason);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/assignments/:taskId/complete
 * Atomically complete a task
 */
router.post("/:taskId/complete", protect, async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ success: false, error: "Task not found" });
        }

        // Only admin or assigned user may mark complete
        if (req.user.role !== "Admin" && String(task.assignedUserId) !== String(req.user.id)) {
            return res.status(403).json({ success: false, error: "Not allowed to complete this task" });
        }

        const result = await completeTaskAtomically(taskId);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
