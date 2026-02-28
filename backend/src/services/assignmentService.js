import mongoose from "mongoose";
import Task from "../models/Task.js";
import User from "../models/User.js";
import AssignmentLog from "../models/AssignmentLog.js";

export async function assignTaskAtomically(taskId, userId, reason = "") {

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
        if (!task) {
            throw new Error("Task not found");
        }
        if (task.assignedUserId) {
            throw new Error("Task is already assigned");
        }


        const user = supportsTransactions
            ? await User.findById(userId).session(session)
            : await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }


        task.assignedUserId = userId;
        task.status = "In Progress";
        if (supportsTransactions) {
            await task.save({ session });
        } else {
            await task.save();
        }


        if (supportsTransactions) {
            await User.findByIdAndUpdate(
                userId,
                { $inc: { activeTaskCount: 1 } },
                { session }
            );
        } else {
            await User.findByIdAndUpdate(userId, { $inc: { activeTaskCount: 1 } });
        }


        if (supportsTransactions) {
            await AssignmentLog.create(
                [{
                    taskId,
                    assignedTo: userId,
                    reason: reason || "Task assigned"
                }],
                { session }
            );
        } else {
            await AssignmentLog.create({
                taskId,
                assignedTo: userId,
                reason: reason || "Task assigned"
            });
        }

        if (supportsTransactions) {
            await session.commitTransaction();
            console.log(`✅ Task ${taskId} atomically assigned to user ${userId}`);
        } else {
            console.log(`⚠️ Transactions not supported; performed non-transactional assignment for task ${taskId} to user ${userId}`);
        }

        return {
            success: true,
            message: "Task assigned successfully",
            data: { taskId, userId, assignedAt: new Date() }
        };
    } catch (error) {
        if (session && supportsTransactions) {
            await session.abortTransaction();
        }
        console.error("Assignment failed:", error.message);
        throw error;
    } finally {
        if (session) await session.endSession();
    }
}

/**
 * Atomic task reassignment
 */
export async function reassignTaskAtomically(taskId, newUserId, reason = "") {
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
        if (!task) {
            throw new Error("Task not found");
        }
        if (!task.assignedUserId) {
            throw new Error("Task is not assigned");
        }

        const previousUserId = task.assignedUserId;

        // 2. Verify new user exists
        const newUser = supportsTransactions
            ? await User.findById(newUserId).session(session)
            : await User.findById(newUserId);
        if (!newUser) {
            throw new Error("New user not found");
        }

        // 3. Update task assignment
        // Update task
        task.assignedUserId = newUserId;
        if (supportsTransactions) {
            await task.save({ session });
        } else {
            await task.save();
        }

        // Update counts
        if (supportsTransactions) {
            await User.findByIdAndUpdate(previousUserId, { $inc: { activeTaskCount: -1 } }, { session });
            await User.findByIdAndUpdate(newUserId, { $inc: { activeTaskCount: 1 } }, { session });
        } else {
            await User.findByIdAndUpdate(previousUserId, { $inc: { activeTaskCount: -1 } });
            await User.findByIdAndUpdate(newUserId, { $inc: { activeTaskCount: 1 } });
        }

        // Create audit log
        if (supportsTransactions) {
            await AssignmentLog.create([
                {
                    taskId,
                    assignedTo: newUserId,
                    reason: reason || `Reassigned from ${previousUserId}`
                }
            ], { session });
        } else {
            await AssignmentLog.create({
                taskId,
                assignedTo: newUserId,
                reason: reason || `Reassigned from ${previousUserId}`
            });
        }

        if (supportsTransactions) {
            await session.commitTransaction();
            console.log(`✅ Task ${taskId} atomically reassigned from ${previousUserId} to ${newUserId}`);
        } else {
            console.log(`⚠️ Transactions not supported; performed non-transactional reassignment for task ${taskId}`);
        }

        return {
            success: true,
            message: "Task reassigned successfully",
            data: {
                taskId,
                previousUserId,
                newUserId,
                reassignedAt: new Date()
            }
        };
    } catch (error) {
        if (session && supportsTransactions) await session.abortTransaction();
        console.error("Reassignment failed:", error.message);
        throw error;
    } finally {
        if (session) await session.endSession();
    }
}

/**
 * Atomic task completion and unassignment
 */
export async function completeTaskAtomically(taskId) {
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
        if (!task) {
            throw new Error("Task not found");
        }

        const userId = task.assignedUserId;
        if (!userId) {
            throw new Error("Task is not assigned");
        }

        // Update task status
        task.status = "Done";
        if (supportsTransactions) {
            await task.save({ session });
        } else {
            await task.save();
        }

        // Decrement user's active task count
        if (supportsTransactions) {
            await User.findByIdAndUpdate(userId, { $inc: { activeTaskCount: -1 } }, { session });
        } else {
            await User.findByIdAndUpdate(userId, { $inc: { activeTaskCount: -1 } });
        }

        // Create audit log
        if (supportsTransactions) {
            await AssignmentLog.create([{ taskId, assignedTo: userId, reason: "Task completed" }], { session });
        } else {
            await AssignmentLog.create({ taskId, assignedTo: userId, reason: "Task completed" });
        }

        if (supportsTransactions) {
            await session.commitTransaction();
            console.log(`✅ Task ${taskId} completed atomically`);
        } else {
            console.log(`⚠️ Transactions not supported; performed non-transactional completion for task ${taskId}`);
        }

        return {
            success: true,
            message: "Task completed successfully",
            data: { taskId, completedAt: new Date() }
        };
    } catch (error) {
        if (session && supportsTransactions) await session.abortTransaction();
        console.error("Completion failed:", error.message);
        throw error;
    } finally {
        if (session) await session.endSession();
    }
}
