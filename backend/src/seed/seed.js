import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Task from "../models/Task.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

console.log("Connected to DB");

const seedUserPassword = process.env.SEED_USER_PASSWORD;
if (!seedUserPassword) {
  throw new Error("Missing SEED_USER_PASSWORD for seed script.");
}
const hashedSeedUserPassword = await bcrypt.hash(seedUserPassword, 10);

await User.deleteMany();
await Task.deleteMany();

const departments = ["Finance", "HR", "IT", "Operations"];
const locations = ["Mumbai", "Delhi", "Bangalore", "Remote"];


const users = [];

for (let i = 1; i <= 100; i++) {
  users.push({
    name: `User ${i}`,
    email: `user${i}@test.com`,
    password: hashedSeedUserPassword,
    role: "User",
    department: departments[Math.floor(Math.random() * departments.length)],
    experienceYears: Math.floor(Math.random() * 10),
    location: locations[Math.floor(Math.random() * locations.length)],
    activeTaskCount: Math.floor(Math.random() * 5)
  });
}

await User.insertMany(users);
console.log("Users created");


const tasks = [];

for (let i = 1; i <= 20; i++) {
  tasks.push({
    title: `Task ${i}`,
    description: "Sample task description",
    priority: ["Low", "Medium", "High"][
      Math.floor(Math.random() * 3)
    ],
    rules: {
      department: departments[Math.floor(Math.random() * departments.length)],
      minExperience: Math.floor(Math.random() * 5),
      maxActiveTasks: 5
    }
  });
}

await Task.insertMany(tasks);

console.log("Tasks created");

process.exit();
