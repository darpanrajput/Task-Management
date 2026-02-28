# Task Management Platform

Task management system with eligibility-based assignment, role-based access, caching, async recomputation, and Dockerized backend.

## 1. Public GitHub Repository

If you want to publish this project as a public repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then set repository visibility to **Public** in GitHub settings.

## 2. Docker Setup (Backend)

Backend stack uses Docker Compose (`backend/docker-compose.yml`) and starts:
- Node backend (`5000`)
- MongoDB (`27017`)
- Redis (`6379`)

### Start backend services

```bash
cd backend
docker compose up -d --build
```

### Verify

```bash
docker compose ps
docker compose logs -f backend
curl http://localhost:5000/api/health
```

### Stop

```bash
docker compose down
```

### Reset database and Redis volumes

```bash
docker compose down -v
```

## Frontend Local Run

```bash
cd frontend
npm install
npm run dev
```

App URL: `http://localhost:5173`  
API proxy to backend: `/api -> http://localhost:5000`

## 3. DB Migrations

Migrations are implemented and tracked in MongoDB collection `_migrations`.

Files:
- `backend/src/migrations/runner.js`
- `backend/src/migrations/001_create_performance_indexes.js`
- `backend/src/migrate.js`

Run manually:

```bash
cd backend
npm run migrate
```

Migrations also run automatically on backend startup after MongoDB connection.

## 4. Architecture Decisions

- **Frontend**: React + Vite, client-side routing, JWT-based authenticated requests.
- **Backend**: Express REST API with service/controller split for task/auth/assignment concerns.
- **Data store**: MongoDB for transactional domain data.
- **Queue/async compute**: BullMQ + Redis for eligibility recomputation jobs.
- **Caching**: Redis cache for frequently requested eligibility results.
- **Auth model**: JWT with role-based authorization in protected routes.

## Indexing Strategy

Indexes are defined in schemas and migrations for high-frequency access paths:

- `users`
  - unique `email`
  - `role`
  - profile fields used by rule matching: `department`, `experienceYears`, `activeTaskCount`, `location`
- `tasks`
  - `status`, `priority`, `assignedUserId`, `createdBy`
  - migration index: `(assignedUserId, status, createdAt desc)`
- `taskeligibilities`
  - `(taskId, userId)` unique
  - `taskId`, `userId`, `isEligible`
  - migration index: `(userId, isEligible, taskId)`
- `assignmentlogs`
  - migration index: `(taskId, createdAt desc)`

Rationale:
- Fast task-board/status filtering for assigned users.
- Fast eligibility lookups by user/task.
- Fast assignment audit timeline fetches.

## Caching Strategy

- Redis is used for eligibility read caching.
- Key pattern: `eligible_users:<taskId>`.
- `GET /api/eligibility/:taskId` checks Redis first, then DB on miss.
- `POST /api/eligibility/recompute-all` invalidates `eligible_users:*` keys.
- `DELETE /api/eligibility/:taskId/cache` invalidates one task’s cache.

Rationale:
- Eligibility reads are frequent and expensive with population joins.
- Cache reduces repeated DB load for hot tasks.

## Rule Engine Design

Eligibility rules are task-driven and evaluated against user attributes:
- `department`
- `minExperience`
- `maxActiveTasks`
- `location`

Design choices:
- Rules stored on each task (`task.rules`) to keep rules versioned with task data.
- Computed eligibility persisted in `TaskEligibility` for quick serving and filtering.
- Assignment endpoints re-check mismatch reasons and can force assign only for admin.

## Recompute Strategy

- On task creation, task-specific eligibility recomputation is queued.
- Manual endpoints:
  - `POST /api/eligibility/:taskId/recompute` (single task)
  - `POST /api/eligibility/recompute-all` (global recompute)
- Worker (`backend/src/workers/eligibilityWorker.js`) processes jobs asynchronously and updates `TaskEligibility`.
- Full recompute also clears eligibility cache keys.

Rationale:
- Keeps write-path latency low.
- Scales recomputation independently from API traffic.

## 5. Seed Data

### Startup Auto Seed

On backend startup, if database has no users and no tasks, it auto-seeds:
- 1 admin
- 100 users
- 20 tasks

Seed credentials are no longer hardcoded.
- Configure `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `SEED_USER_PASSWORD` in environment variables or pass them in seed API payload.
- User email pattern remains `user{n}@test.com`.

### Seed API (Admin only)

- `POST /api/seed`
- `POST /api/seed/clear`

### Legacy scripts

```bash
cd backend
node src/seed/clear.js
npm run seed
```

## 6. API Documentation

Detailed API reference is in:
- [`docs/API.md`](./docs/API.md)

Also included:
- `backend/postman_collection.json`

## Environment Notes

Docker compose already provides backend env values:
- `PORT`
- `MONGO_URI`
- `REDIS_URL`
- `JWT_SECRET`

Copy and edit `backend/.env.example` before starting services so no secrets are committed or hardcoded.

For production, move secrets out of compose into secure env/secrets management.
