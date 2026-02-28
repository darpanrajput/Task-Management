import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function toMigrationName(fileName) {
    return fileName.replace(/\.js$/, "");
}

export async function runMigrations() {
    if (mongoose.connection.readyState !== 1) {
        throw new Error("Mongoose must be connected before running migrations");
    }

    const db = mongoose.connection.db;
    const migrationCollection = db.collection("_migrations");

    await migrationCollection.createIndex({ name: 1 }, { unique: true });

    const files = (await fs.readdir(__dirname))
        .filter((f) => /^\d+.*\.js$/.test(f))
        .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
        const migrationName = toMigrationName(file);
        const alreadyApplied = await migrationCollection.findOne({ name: migrationName });
        if (alreadyApplied) {
            continue;
        }

        const migrationPath = path.join(__dirname, file);
        const migrationModule = await import(pathToFileURL(migrationPath).href);
        if (typeof migrationModule.up !== "function") {
            throw new Error(`Migration ${migrationName} does not export an 'up' function`);
        }

        await migrationModule.up(db);
        await migrationCollection.insertOne({
            name: migrationName,
            appliedAt: new Date()
        });

        console.log(`Applied migration: ${migrationName}`);
    }
}
