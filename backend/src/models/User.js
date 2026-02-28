import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },

        email: { type: String, required: true, unique: true, index: true },

        password: { type: String, required: true },

        role: {
            type: String,
            enum: ["Admin", "Manager", "User"],
            default: "User",
            index: true
        },

        department: {
            type: String,
            enum: ["Finance", "HR", "IT", "Operations"],
            index: true
        },

        experienceYears: {
            type: Number,
            index: true
        },

        location: {
            type: String,
            index: true
        },

        activeTaskCount: {
            type: Number,
            default: 0,
            index: true
        }
    },
    { timestamps: true }
);


userSchema.index({
    department: 1,
    experienceYears: 1,
    activeTaskCount: 1
});

export default mongoose.model("User", userSchema);
