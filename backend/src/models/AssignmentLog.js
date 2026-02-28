import mongoose from "mongoose";

const assignmentLogSchema = new mongoose.Schema(
    {
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task"
        },

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        reason: String
    },
    { timestamps: true }
);

export default mongoose.model("AssignmentLog", assignmentLogSchema);
