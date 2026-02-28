export const name = "001_create_performance_indexes";

export async function up(db) {
    await db.collection("tasks").createIndex(
        { assignedUserId: 1, status: 1, createdAt: -1 },
        { name: "idx_tasks_assigned_status_createdAt" }
    );

    await db.collection("taskeligibilities").createIndex(
        { userId: 1, isEligible: 1, taskId: 1 },
        { name: "idx_taskelig_user_eligible_task" }
    );

    await db.collection("assignmentlogs").createIndex(
        { taskId: 1, createdAt: -1 },
        { name: "idx_assignmentlogs_task_createdAt" }
    );
}
