import Task from "../models/Task.js";
import User from "../models/User.js";
import TaskEligibility from "../models/TaskEligibility.js";
import { clearEligibilityCache, queueEligibilityComputation } from "./eligibilityService.js";
import mongoose from "mongoose";
import AssignmentLog from "../models/AssignmentLog.js";

/**
 * Check if a user is eligible for a task based on rules
 */
function isUserEligibleForTask(user, taskRules) {
    if (!user || !taskRules) return false;

    if (taskRules.department && user.department !== taskRules.department) {
        return false;
    }

    if (taskRules.minExperience !== undefined &&
        (user.experienceYears === undefined || user.experienceYears < taskRules.minExperience)) {
        return false;
    }

    if (taskRules.maxActiveTasks !== undefined &&
        (user.activeTaskCount === undefined || user.activeTaskCount > taskRules.maxActiveTasks)) {
        return false;
    }

    if (taskRules.location && user.location !== taskRules.location) {
        return false;
    }

    return true;
}

function buildNonAdminEligibilityQuery(taskRules = {}) {
    const query = { role: { $ne: "Admin" } };

    if (taskRules.department) {
        query.department = taskRules.department;
    }
    if (taskRules.minExperience !== undefined) {
        query.experienceYears = { $gte: Number(taskRules.minExperience) };
    }
    if (taskRules.maxActiveTasks !== undefined) {
        query.activeTaskCount = { $lte: Number(taskRules.maxActiveTasks) };
    }
    if (taskRules.location) {
        query.location = taskRules.location;
    }

    return query;
}

export const getAllTasks = async () => {
    const tasks = await Task.find()
        .select("-password")
        .lean()
        .sort({ createdAt: -1 });

    return tasks;
};

export const createTask = async (data) => {

    let supportsTransactions = false;
    try {
        const hello = await mongoose.connection.db.admin().command({ hello: 1 }).catch(() => null);
        const ismaster = await mongoose.connection.db.admin().command({ ismaster: 1 }).catch(() => null);
        const info = hello || ismaster;
        if (info && (info.setName || info.msg === "isdbgrid")) {
            supportsTransactions = true;
        }
    } catch (e) {
        supportsTransactions = false;
    }

    let session;
    if (supportsTransactions) {
        session = await mongoose.startSession();
        session.startTransaction();
    }

    try {

        const taskDoc = supportsTransactions
            ? await Task.create([data], { session })
            : await Task.create([data]);
        const task = taskDoc[0];

        console.log("Task " + task._id + " created");


        if (task.createdBy) {
            const creator = supportsTransactions
                ? await User.findById(task.createdBy).session(session)
                : await User.findById(task.createdBy);

            let autoAssignee = null;
            let autoAssignReason = "Auto-assigned to task creator";

            if (creator && creator.role !== "Admin" && isUserEligibleForTask(creator, task.rules)) {
                autoAssignee = creator;
            } else if (creator && creator.role === "Admin") {
                const candidateQuery = User.findOne(buildNonAdminEligibilityQuery(task.rules))
                    .sort({ activeTaskCount: 1, experienceYears: -1, createdAt: 1 });

                autoAssignee = supportsTransactions
                    ? await candidateQuery.session(session)
                    : await candidateQuery;

                if (autoAssignee) {
                    autoAssignReason = "Auto-assigned by eligibility (admin creator excluded)";
                }
            }

            if (autoAssignee) {
                console.log("Auto-assigning task " + task._id + " to user " + autoAssignee._id);


                task.assignedUserId = autoAssignee._id;
                task.status = "In Progress";
                if (supportsTransactions) {
                    await task.save({ session });
                } else {
                    await task.save();
                }


                if (supportsTransactions) {
                    await User.findByIdAndUpdate(
                        autoAssignee._id,
                        { $inc: { activeTaskCount: 1 } },
                        { session }
                    );
                } else {
                    await User.findByIdAndUpdate(autoAssignee._id, { $inc: { activeTaskCount: 1 } });
                }


                if (supportsTransactions) {
                    await AssignmentLog.create([{
                        taskId: task._id,
                        assignedTo: autoAssignee._id,
                        reason: autoAssignReason
                    }], { session });
                } else {
                    await AssignmentLog.create({
                        taskId: task._id,
                        assignedTo: autoAssignee._id,
                        reason: autoAssignReason
                    });
                }

                console.log("Task " + task._id + " auto-assigned to user " + autoAssignee._id);
            }
        }

        if (supportsTransactions) {
            await session.commitTransaction();
            console.log("Task creation transaction committed");
        }


        queueEligibilityComputation(task._id).catch(err => {
            console.error("Failed to queue eligibility computation:", err);
        });

        return task;
    } catch (error) {
        if (session && supportsTransactions) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        if (session) await session.endSession();
    }
};

export const getEligibleUsers = async (taskId) => {
    const eligibilities = await TaskEligibility.find({
        taskId,
        isEligible: true,
    }).populate("userId");

    return eligibilities;
};

export const getMyEligibleTasks = async (userId) => {
    const [eligibilities, assignedTasks] = await Promise.all([
        TaskEligibility.find({
            userId,
            isEligible: true,
        }).populate({
            path: "taskId",
            populate: { path: "assignedUserId", select: "name role email" }
        }),
        Task.find({ assignedUserId: userId })
            .populate("assignedUserId", "name role email")
            .lean()
    ]);

    const taskMap = new Map();

    for (const eligibility of eligibilities) {
        if (!eligibility?.taskId?._id) continue;
        taskMap.set(String(eligibility.taskId._id), eligibility.taskId);
    }

    for (const task of assignedTasks) {
        if (!task?._id) continue;
        taskMap.set(String(task._id), task);
    }

    return Array.from(taskMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
};

export const updateTask = async (taskId, updateData) => {
    const task = await Task.findByIdAndUpdate(taskId, updateData, { new: true });
    if (!task) throw new Error("Task not found");
    return task;
};

export const deleteTask = async (taskId) => {
    let supportsTransactions = false;
    try {
        const hello = await mongoose.connection.db.admin().command({ hello: 1 }).catch(() => null);
        const ismaster = await mongoose.connection.db.admin().command({ ismaster: 1 }).catch(() => null);
        const info = hello || ismaster;
        if (info && (info.setName || info.msg === "isdbgrid")) {
            supportsTransactions = true;
        }
    } catch (e) {
        supportsTransactions = false;
    }

    let session;
    if (supportsTransactions) {
        session = await mongoose.startSession();
        session.startTransaction();
    }

    try {
        const task = supportsTransactions
            ? await Task.findById(taskId).session(session)
            : await Task.findById(taskId);

        if (!task) throw new Error("Task not found");

        const assignedUserId = task.assignedUserId;

        if (supportsTransactions) {
            await Task.deleteOne({ _id: taskId }, { session });
            await TaskEligibility.deleteMany({ taskId }, { session });
            await AssignmentLog.deleteMany({ taskId }, { session });
        } else {
            await Task.deleteOne({ _id: taskId });
            await TaskEligibility.deleteMany({ taskId });
            await AssignmentLog.deleteMany({ taskId });
        }

        if (assignedUserId) {
            if (supportsTransactions) {
                await User.updateOne(
                    { _id: assignedUserId, activeTaskCount: { $gt: 0 } },
                    { $inc: { activeTaskCount: -1 } },
                    { session }
                );
            } else {
                await User.updateOne(
                    { _id: assignedUserId, activeTaskCount: { $gt: 0 } },
                    { $inc: { activeTaskCount: -1 } }
                );
            }
        }

        if (supportsTransactions) {
            await session.commitTransaction();
        }

        clearEligibilityCache(taskId).catch((err) => {
            console.error("Failed to clear eligibility cache after task delete:", err);
        });

        return {
            success: true,
            message: "Task deleted successfully",
            data: { taskId, deletedAt: new Date() }
        };
    } catch (error) {
        if (session && supportsTransactions) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        if (session) await session.endSession();
    }
};
