import mongoose from "mongoose";

const taskEligibilitySchema = new mongoose.Schema(
    {
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        isEligible: {
            type: Boolean,
            default: true,
            index: true
        },

        computedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

taskEligibilitySchema.index({ taskId: 1, userId: 1 }, { unique: true });

export default mongoose.model("TaskEligibility", taskEligibilitySchema);
