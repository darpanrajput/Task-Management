import mongoose from "mongoose";

const ruleSchema = new mongoose.Schema(
    {
        department: String,
        minExperience: Number,
        maxActiveTasks: Number,
        location: String
    },
    { timestamps: true },
    { _id: false }
);

const taskSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },

        description: String,

        status: {
            type: String,
            enum: ["Todo", "In Progress", "Done"],
            default: "Todo",
            index: true
        },

        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium",
            index: true
        },

        dueDate: { type: Date },

        rules: ruleSchema,

        assignedUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        }
    },
    { timestamps: true }
);

taskSchema.index({ "rules.department": 1 });
taskSchema.index({ "rules.minExperience": 1 });
taskSchema.index({ "rules.maxActiveTasks": 1 });

export default mongoose.model("Task", taskSchema);
