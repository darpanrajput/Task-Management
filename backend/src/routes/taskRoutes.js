import express from "express";
import {
    createTask,
    deleteTask,
    getAllTasks,
    getEligibleUsers,
    getMyEligibleTasks,
    updateTask,
} from "../controllers/taskController.js";
import validateInputs from "../middlewares/validateInputs.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(validateInputs);

router.get("/", getAllTasks);
router.post("/", protect, createTask);
router.patch("/:id", protect, updateTask);
router.delete("/:id", protect, deleteTask);
router.get("/:id/eligible-users", getEligibleUsers);
router.get("/my-eligible-tasks", protect, async (req, res, next) => {
    console.log("Middleware before getMyEligibleTasks, user:", req?.user);
    next();
}, getMyEligibleTasks);

export default router;
