# API Documentation

Base URL:
- Local: `http://localhost:5000/api`

Auth:
- Use JWT bearer token for protected endpoints.
- Header: `Authorization: Bearer <token>`

## Health

- `GET /health`
  - Response: `{ "message": "Backend running" }`

## Auth

- `POST /auth/register`
  - Body:
    ```json
    {
      "name": "Administrator",
      "email": "<admin-email>",
      "password": "<admin-password>",
      "role": "Admin",
      "department": "IT",
      "experienceYears": 10,
      "location": "Remote"
    }
    ```
  - Response: created user (password excluded)

- `POST /auth/login`
  - Body:
    ```json
    {
      "email": "<admin-email>",
      "password": "<admin-password>"
    }
    ```
  - Response:
    ```json
    {
      "user": { "_id": "...", "name": "...", "role": "Admin" },
      "token": "..."
    }
    ```

## Users

- `GET /users` (protected)
- `GET /users/:id` (protected)
- `PUT /users/:id` (protected)

## Tasks

- `GET /tasks`
  - Returns all tasks

- `POST /tasks` (protected)
  - Create task

- `PATCH /tasks/:id` (protected)
  - Allowed updates: `status`, `title`, `description`, `priority`, `dueDate`
  - Allowed actor: admin, assigned user, or creator

- `DELETE /tasks/:id` (protected)
  - Deletes the task
  - Allowed actor: admin or creator
  - Also removes related eligibility records, assignment logs, and clears eligibility cache for that task

- `GET /tasks/:id/eligible-users`
  - Returns eligible users for a task

- `GET /tasks/my-eligible-tasks` (protected)
  - Returns merged list:
    - tasks where user is eligible
    - tasks assigned to the user

## Eligibility

- `GET /eligibility/:taskId`
  - Returns cached/DB eligible users for task

- `POST /eligibility/:taskId/recompute`
  - Queues recomputation for one task

- `POST /eligibility/recompute-all`
  - Queues full recomputation for all tasks

- `DELETE /eligibility/:taskId/cache`
  - Clears eligibility cache for one task

## Assignments

- `POST /assignments/:taskId/assign` (protected)
  - Body:
    ```json
    {
      "userId": "<user_id>",
      "reason": "Assigning for release",
      "forceAssign": false
    }
    ```

- `POST /assignments/:taskId/reassign` (protected)
  - Body:
    ```json
    {
      "newUserId": "<user_id>",
      "reason": "Workload balancing",
      "forceAssign": false
    }
    ```

- `POST /assignments/:taskId/complete` (protected)

## Seed (Admin Only)

- `POST /seed` (protected, admin)
  - Optional body:
    ```json
    {
      "usersCount": 100,
      "tasksCount": 20,
      "clearBeforeSeed": true,
      "includeAdmin": true,
      "adminEmail": "<admin-email>",
      "adminPassword": "<admin-password>",
      "userPassword": "<user-password>"
    }
    ```
  - If passwords are not provided in body, backend reads `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD`.

- `POST /seed/clear` (protected, admin)
  - Optional body:
    ```json
    { "keepAdmins": true }
    ```

## Error Format

Most endpoints return:
```json
{ "message": "..." }
```
or
```json
{ "success": false, "error": "..." }
```
