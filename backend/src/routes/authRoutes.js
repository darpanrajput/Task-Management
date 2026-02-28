import express from "express";
import * as authService from "../services/authService.js";
import validateInputs from "../middlewares/validateInputs.js";
import { loginLimiter, registerLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.use(validateInputs);

router.post("/register", registerLimiter, async (req, res) => {
    try {
        const user = await authService.registerUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post("/login", loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        const data = await authService.loginUser(email, password);
        res.json(data);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
