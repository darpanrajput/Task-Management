import bcrypt from "bcrypt";
import User from "../models/User.js";
import Task from "../models/Task.js";
import AssignmentLog from "../models/AssignmentLog.js";
import TaskEligibility from "../models/TaskEligibility.js";

const DEPARTMENTS = ["Finance", "HR", "IT", "Operations"];
const LOCATIONS = ["Mumbai", "Delhi", "Bangalore", "Remote"];
const PRIORITIES = ["Low", "Medium", "High"];

function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function toPositiveInt(value, fallback, max = 1000) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) return fallback;
    return Math.min(n, max);
}

export const clearSeedData = async ({ keepAdmins = true } = {}) => {
    const tasksDeleted = await Task.deleteMany({});
    const logsDeleted = await AssignmentLog.deleteMany({});
    const eligibilityDeleted = await TaskEligibility.deleteMany({});
    const usersDeleted = keepAdmins
        ? await User.deleteMany({ role: { $ne: "Admin" } })
        : await User.deleteMany({});
    const adminCount = await User.countDocuments({ role: "Admin" });

    return {
        tasksDeleted: tasksDeleted.deletedCount,
        assignmentLogsDeleted: logsDeleted.deletedCount,
        eligibilityDeleted: eligibilityDeleted.deletedCount,
        usersDeleted: usersDeleted.deletedCount,
        adminCount
    };
};

export const seedData = async (options = {}) => {
    const usersCount = toPositiveInt(options.usersCount, 100, 10000);
    const tasksCount = toPositiveInt(options.tasksCount, 20, 10000);
    const clearBeforeSeed = options.clearBeforeSeed !== false;
    const includeAdmin = options.includeAdmin !== false;
    const userPasswordInput = options.userPassword ?? process.env.SEED_USER_PASSWORD;
    if (!userPasswordInput) {
        throw new Error("Missing seed user password. Provide userPassword or SEED_USER_PASSWORD.");
    }
    const userPassword = String(userPasswordInput);

    const adminPasswordInput = options.adminPassword ?? process.env.SEED_ADMIN_PASSWORD;
    const adminEmailInput = options.adminEmail ?? process.env.SEED_ADMIN_EMAIL;
    const adminName = String(options.adminName ?? process.env.SEED_ADMIN_NAME ?? "Administrator");

    if (includeAdmin && !adminPasswordInput) {
        throw new Error("Missing seed admin password. Provide adminPassword or SEED_ADMIN_PASSWORD.");
    }
    if (includeAdmin && !adminEmailInput) {
        throw new Error("Missing seed admin email. Provide adminEmail or SEED_ADMIN_EMAIL.");
    }

    const adminPassword = adminPasswordInput ? String(adminPasswordInput) : null;
    const adminEmail = adminEmailInput ? String(adminEmailInput).toLowerCase() : null;

    let cleared = null;
    if (clearBeforeSeed) {
        cleared = await clearSeedData({ keepAdmins: false });
    }

    const hashedUserPassword = await bcrypt.hash(userPassword, 10);
    const users = [];
    let adminUser = null;

    if (includeAdmin) {
        const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
        adminUser = await User.create({
            name: adminName,
            email: adminEmail,
            password: hashedAdminPassword,
            role: "Admin",
            department: "IT",
            experienceYears: 10,
            location: "Remote",
            activeTaskCount: 0
        });
    }

    for (let i = 1; i <= usersCount; i += 1) {
        users.push({
            name: `User ${i}`,
            email: `user${i}@test.com`,
            password: hashedUserPassword,
            role: "User",
            department: randomFrom(DEPARTMENTS),
            experienceYears: Math.floor(Math.random() * 10),
            location: randomFrom(LOCATIONS),
            activeTaskCount: Math.floor(Math.random() * 5)
        });
    }

    const insertedUsers = users.length ? await User.insertMany(users) : [];

    const tasks = [];
    for (let i = 1; i <= tasksCount; i += 1) {
        tasks.push({
            title: `Task ${i}`,
            description: "Sample task description",
            priority: randomFrom(PRIORITIES),
            rules: {
                department: randomFrom(DEPARTMENTS),
                minExperience: Math.floor(Math.random() * 5),
                maxActiveTasks: 5
            },
            createdBy: adminUser?._id || null
        });
    }

    const insertedTasks = tasks.length ? await Task.insertMany(tasks) : [];

    return {
        cleared,
        usersCreated: insertedUsers.length + (adminUser ? 1 : 0),
        tasksCreated: insertedTasks.length,
        adminCreated: !!adminUser,
        seededAccounts: {
            adminEmail: adminUser ? adminEmail : null,
            userEmailPattern: "user{n}@test.com"
        }
    };
};
