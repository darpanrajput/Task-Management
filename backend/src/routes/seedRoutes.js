import express from "express";
import validateInputs from "../middlewares/validateInputs.js";
import { protect } from "../middlewares/authMiddleware.js";
import { clearSeedData, seedData } from "../services/seedService.js";

const router = express.Router();

router.use(validateInputs);

router.post("/clear", protect, async (req, res) => {
    try {
        if (req.user?.role !== "Admin") {
            return res.status(403).json({ message: "Only admins can clear seed data" });
        }

        const keepAdmins = req.body?.keepAdmins !== false;
        const result = await clearSeedData({ keepAdmins });
        return res.json({
            success: true,
            message: "Seed data cleared successfully",
            ...result
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
});

router.post("/", protect, async (req, res) => {
    try {
        if (req.user?.role !== "Admin") {
            return res.status(403).json({ message: "Only admins can seed data" });
        }

        const result = await seedData(req.body || {});
        return res.status(201).json({
            success: true,
            message: "Seed data generated successfully",
            ...result
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
});

export default router;
