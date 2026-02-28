import express from "express";
import { getUserById, getUsers, updateUser } from "../controllers/userController.js";
import validateInputs from "../middlewares/validateInputs.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(validateInputs);

router.get("/", protect, getUsers);
router.get("/:id", protect, getUserById);
router.put("/:id", protect, updateUser);

export default router;
