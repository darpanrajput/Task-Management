import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Task from "../models/Task.js";
import AssignmentLog from "../models/AssignmentLog.js";
import TaskEligibility from "../models/TaskEligibility.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

console.log("Clearing database...");

// Clear all tasks
const tasksDeleted = await Task.deleteMany({});
console.log("Deleted " + tasksDeleted.deletedCount + " tasks");

// Clear all assignment logs
const logsDeleted = await AssignmentLog.deleteMany({});
console.log("Deleted " + logsDeleted.deletedCount + " assignment logs");

// Clear all task eligibility records
const eligDeleted = await TaskEligibility.deleteMany({});
console.log("Deleted " + eligDeleted.deletedCount + " task eligibility records");

// Clear all users except admin
const usersDeleted = await User.deleteMany({ role: { $ne: "Admin" } });
console.log("Deleted " + usersDeleted.deletedCount + " non-admin users");

// Verify admin still exists
const adminCount = await User.countDocuments({ role: "Admin" });
console.log("Admin users remaining: " + adminCount);

if (adminCount === 0) {
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    const adminName = process.env.SEED_ADMIN_NAME || "Administrator";

    if (!adminEmail || !adminPassword) {
        throw new Error("Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD for admin bootstrap.");
    }

    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    console.log("No admin user found. Creating admin from environment variables...");
    await User.create({
        name: adminName,
        email: adminEmail.toLowerCase(),
        password: hashedAdminPassword,
        role: "Admin",
        department: "IT",
        experienceYears: 10,
        location: "Remote",
        activeTaskCount: 0
    });
    console.log("Default admin user created");
}

console.log("\nDatabase cleared successfully!");
process.exit();
