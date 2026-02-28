# Auto Assignment During Task Creation

This document explains how automatic task assignment works when a task is created.

## Trigger Point

Auto assignment is evaluated during `POST /api/tasks` inside:
- `backend/src/controllers/taskController.js` (`createTask`)
- `backend/src/services/taskService.js` (`createTask`)

## End-to-End Flow

1. A user creates a task through `POST /api/tasks`.
2. Backend sets `createdBy = req.user.id` (if authenticated).
3. Task is inserted into MongoDB.
4. If `createdBy` exists, backend fetches the creator user record.
5. Backend checks creator eligibility against `task.rules`.
6. If creator role is not `Admin` and creator is eligible, backend auto-assigns the new task to the creator.
7. If creator role is `Admin`, backend auto-selects an eligible non-admin user and assigns the task.
8. Backend queues async eligibility recomputation for the task.

## Eligibility Rules Used

The creator is considered eligible only if all configured rules match:
- `department`: user department must equal task rule department.
- `minExperience`: user `experienceYears` must be >= rule value.
- `maxActiveTasks`: user `activeTaskCount` must be <= rule value.
- `location`: user location must equal task rule location.

If a rule is not provided, it is ignored.

Additional role condition:
- Task is never auto-assigned to an `Admin`.
- For admin-created tasks, backend picks a non-admin eligible user with:
  - lowest `activeTaskCount`
  - then higher `experienceYears`
  - then oldest `createdAt`

## What Happens On Successful Auto Assignment

When creator is eligible:
- `task.assignedUserId` is set to creator id.
- `task.status` is changed from default `Todo` to `In Progress`.
- Creator `activeTaskCount` is incremented by `1`.
- An `AssignmentLog` entry is created with reason:
  - `Auto-assigned to task creator`

## If Creator Is Not Eligible

If no eligible non-admin candidate is found (or creator is not found):
- Task is still created.
- `assignedUserId` remains `null`.
- Status remains default `Todo`.
- No assignment log is created.

## Transaction Behavior

- If MongoDB deployment supports transactions (replica set/sharded), task creation + auto-assignment updates are committed in one transaction.
- If transactions are not supported, the same steps run non-transactionally.

## Async Recompute

After creation path completes, backend triggers:
- `queueEligibilityComputation(task._id)`

This updates `TaskEligibility` records asynchronously and refreshes eligibility cache behavior.

## Data Effects Summary

Collections potentially updated during task creation:
- `tasks`
- `users` (only on successful auto assignment)
- `assignmentlogs` (only on successful auto assignment)
- `taskeligibilities` (async worker)
