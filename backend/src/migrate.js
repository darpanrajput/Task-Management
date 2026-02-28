import mongoose from "mongoose";
import dotenv from "dotenv";
import { runMigrations } from "./migrations/runner.js";

dotenv.config();

try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected. Running migrations...");
    await runMigrations();
    console.log("Migrations completed.");
    await mongoose.disconnect();
    process.exit(0);
} catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
}
