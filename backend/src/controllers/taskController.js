import * as taskService from "../services/taskService.js";
import Task from "../models/Task.js";

export const getAllTasks = async (req, res) => {
    try {
        const tasks = await taskService.getAllTasks();
        res.json({ success: true, tasks, count: tasks.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createTask = async (req, res) => {
    try {
        const data = { ...req.body };
        if (req.user && req.user.id) {
            data.createdBy = req.user.id;
        }

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Task creation timeout")), 5000)
        );

        const task = await Promise.race([
            taskService.createTask(data),
            timeoutPromise
        ]);

        console.log("Task created successfully:", task._id);
        res.status(201).json(task);
    } catch (error) {
        console.error("Task creation error:", error.message);
        res.status(400).json({ message: error.message });
    }
};

export const getEligibleUsers = async (req, res) => {
    try {
        const users = await taskService.getEligibleUsers(req.params.id);
        res.json(users);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getMyEligibleTasks = async (req, res) => {
    try {
        console.log("Fetching eligible tasks for user:", req?.user?.id);
        const tasks = await taskService.getMyEligibleTasks(req.user.id);
        res.json(tasks);
    } catch (error) {
        console.error("Error fetching eligible tasks:", error);
        res.status(400).json({ message: error.message });
    }
};

export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;


        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }


        const taskDoc = await Task.findById(id);
        if (!taskDoc) return res.status(404).json({ message: "Task not found" });

        const actor = req.user;
        const isAdmin = actor.role === "Admin";
        const isAssigned = taskDoc.assignedUserId && String(taskDoc.assignedUserId) === String(actor.id);
        const isCreator = taskDoc.createdBy && String(taskDoc.createdBy) === String(actor.id);

        if (!isAdmin && !isAssigned && !isCreator) {
            return res.status(403).json({ message: "Forbidden: not allowed to update this task" });
        }


        const allowedFields = ["status", "title", "description", "priority", "dueDate"];
        const updateData = {};
        for (const key of allowedFields) {
            if (req.body[key] !== undefined) updateData[key] = req.body[key];
        }

        const updated = await taskService.updateTask(id, updateData);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const taskDoc = await Task.findById(id);
        if (!taskDoc) return res.status(404).json({ message: "Task not found" });

        const actor = req.user;
        const isAdmin = actor.role === "Admin";
        const isCreator = taskDoc.createdBy && String(taskDoc.createdBy) === String(actor.id);

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ message: "Forbidden: not allowed to delete this task" });
        }

        const result = await taskService.deleteTask(id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
