import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import redisClient from "./config/redis.js";
import { initializeWorker } from "./workers/eligibilityWorker.js";
import { eligibilityQueue } from "./config/queue.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import eligibilityRoutes from "./routes/eligibilityRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import seedRoutes from "./routes/seedRoutes.js";
import User from "./models/User.js";
import Task from "./models/Task.js";
import { seedData } from "./services/seedService.js";
import { runMigrations } from "./migrations/runner.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("Server is running");
});

app.get("/api/health", (req, res) => {
    res.json({ message: "Backend running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/eligibility", eligibilityRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/seed", seedRoutes);

app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 Not Found</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; }
                .container { margin-top: 50px; }
                h1 { color: #333; }
                p { color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>404 - Page Not Found</h1>
                <p>The requested resource does not exist.</p>
            </div>
        </body>
        </html>
    `);
});

async function seedOnStartupIfDatabaseIsEmpty() {
    const usersCount = await User.countDocuments();
    const tasksCount = await Task.countDocuments();

    if (usersCount === 0 && tasksCount === 0) {
        console.log("No data found. Seeding admin, users, and tasks...");
        await seedData({
            clearBeforeSeed: false,
            includeAdmin: true,
            usersCount: 100,
            tasksCount: 20
        });
        console.log("Startup seeding completed.");
        return;
    }

    console.log(`Startup seed skipped (users=${usersCount}, tasks=${tasksCount}).`);
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log("MongoDB connected.");

    await runMigrations();
    await seedOnStartupIfDatabaseIsEmpty();
    await initializeWorker();

    app.listen(process.env.PORT, () =>
        console.log(`Server running on port ${process.env.PORT}`)
    );
}).catch((err) => console.error("MongoDB Error:", err));

process.on("SIGTERM", async () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    await redisClient.quit();
    await eligibilityQueue.close();
    process.exit(0);
});
