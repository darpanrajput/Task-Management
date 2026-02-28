# 🐳 Docker Setup Guide

## Quick Start

### Pre-requisites
- Docker installed ([Download Docker Desktop](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)

### Development Environment

```bash
# 1. Start all services (MongoDB, Redis, Backend)
docker-compose up -d

# 2. View logs
docker-compose logs -f backend

# 3. Stop services
docker-compose down

# 4. Stop and remove volumes (reset database)
docker-compose down -v
```

### Production Environment

```bash
# 1. Create .env file with production variables
cat > .env.prod << EOF
MONGO_USERNAME=produser
MONGO_PASSWORD=your-secure-password
REDIS_PASSWORD=your-redis-password
JWT_SECRET=your-production-jwt-secret
EOF

# 2. Start production stack
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 3. View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# 4. Stop services
docker-compose -f docker-compose.prod.yml down
```

---

## 📁 Files Created

### 1. **Dockerfile** (Development)
- Uses `node:18-alpine` as base image
- Runs `npm run dev` (with hot reload via volumes)
- Includes health checks
- Optimized for development

### 2. **Dockerfile.prod** (Production)
- Multi-stage build for smaller image size
- Uses `--only=production` dependencies
- Runs `npm start` (no hot reload)
- Optimized for production deployment

### 3. **docker-compose.yml** (Development)
- Backend on port `5000`
- MongoDB on port `27017` (with admin credentials)
- Redis on port `6379`
- Volume mounts for hot reload
- Health checks for all services
- Services depend on MongoDB and Redis being healthy before starting backend

### 4. **docker-compose.prod.yml** (Production)
- Same as development but:
  - Uses `.env` file for credentials
  - `restart: always` policy
  - No volume mounts (immutable container)
  - Environment-based configuration

### 5. **.env.docker** (Docker Environment)
- Pre-configured for Docker container networking
- Uses container names (mongo, redis instead of localhost)

### 6. **.dockerignore**
- Excludes unnecessary files from build context
- Reduces image size

---

## 🚀 Usage Examples

### Check Service Status
```bash
# List running containers
docker-compose ps

# Output:
# NAME                COMMAND             STATUS
# taskdb-backend      npm run dev         Up (healthy)
# taskdb-mongo        mongod              Up (healthy)
# taskdb-redis        redis-server        Up (healthy)
```

### Access Services

#### Backend
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Response: {"message":"Backend running"}
```

#### MongoDB
```bash
# Connect with MongoDB Compass or CLI
mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@localhost:27017/taskdb

# Or using mongosh:
docker-compose exec mongo mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD"
```

#### Redis
```bash
# Connect to Redis
docker-compose exec redis redis-cli
redis> ping
PONG
```

### Seed Database
```bash
# Run seed script inside container
docker-compose exec backend npm run seed

# View output
# Connected to DB
# Users created
# Tasks created
```

### View Logs
```bash
# All services
docker-compose logs

# Only backend
docker-compose logs backend

# Follow logs in real-time
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100
```

### Rebuild Container
```bash
# Rebuild without cache
docker-compose build --no-cache

# Rebuild and restart
docker-compose up -d --build
```

---

## 🔍 Troubleshooting

### Port Already in Use
```bash
# Change port in docker-compose.yml
# From: "5000:5000"
# To:   "5001:5000"

# Or kill process using port
# Windows: netstat -ano | findstr :5000
# Mac/Linux: lsof -i :5000
```

### Container Won't Start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. MongoDB/Redis not healthy yet - wait and retry
# 2. Port already in use - change port mapping
# 3. Missing environment variables - check .env file
```

### Database Connection Error
```bash
# Verify MongoDB is running and healthy
docker-compose ps

# Check MongoDB logs
docker-compose logs mongo

# Re-initialize MongoDB
docker-compose down -v
docker-compose up -d mongo
```

### Redis Connection Error
```bash
# Verify Redis is running
docker-compose exec redis redis-cli ping

# If not responding, restart
docker-compose restart redis
```

### Clear Everything and Start Fresh
```bash
# Remove all containers, volumes, and networks
docker-compose down -v

# Clean up dangling images
docker image prune -f

# Start fresh
docker-compose up -d
```

---

## 📊 Container Details

### Backend Container
```
Image:     node:18-alpine
Port:      5000
Name:      taskdb-backend
Env:       PORT=5000
           MONGO_URI=mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@mongo:27017/taskdb
           REDIS_URL=redis://redis:6379
```

### MongoDB Container
```
Image:     mongo:7.0
Port:      27017
Name:      taskdb-mongo
Username:  admin
Password:  ${MONGO_INITDB_ROOT_PASSWORD}
Database:  taskdb
```

### Redis Container
```
Image:     redis:7-alpine
Port:      6379
Name:      taskdb-redis
Persistence: Enabled (--appendonly yes)
```

---

## 🌐 Docker Network

All services are connected via `task-network` bridge network:
- Backend → MongoDB: `mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@mongo:27017/taskdb`
- Backend → Redis: `redis://redis:6379`

Internal DNS allows service discovery by container name.

---

## 📈 Scaling with Docker

### Run Multiple Backend Instances
```bash
# Scale backend to 3 instances on different ports
docker-compose up -d --scale backend=3

# Use a reverse proxy (nginx) to load balance
# Advanced setup required
```

### Monitor Resource Usage
```bash
# View container stats
docker stats

# Monitor specific container
docker stats taskdb-backend
```

---

## 🔐 Security Tips

### For Production
1. **Change Default Credentials**
   ```bash
   # Update docker-compose.prod.yml
   MONGO_USERNAME=your-secure-username
   MONGO_PASSWORD=your-secure-password
   JWT_SECRET=<production-secret>
   ```

2. **Use Secrets Management**
   - Use Docker Secrets (Swarm mode)
   - Or environment-based configuration

3. **Restrict Network Access**
   - Use network policies
   - Only expose necessary ports
   - Use private networks

4. **Enable Authentication**
   - MongoDB: Already enabled with username/password
   - Redis: Add password in production config

---

## 📝 Common Commands

```bash
# Start all services in background
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs -f

# Execute command in container
docker-compose exec backend npm run seed

# Rebuild images
docker-compose build --no-cache

# Pull latest images
docker-compose pull

# Validate docker-compose file
docker-compose config

# Remove unused containers/images
docker system prune -f
```

---

## 🎯 Next Steps

1. **Implement reverse proxy (Nginx)** - For production load balancing
2. **Add health check endpoints** - Already implemented at `/api/health`
3. **Set up monitoring** - Prometheus + Grafana
4. **Enable logging** - ELK Stack or CloudWatch
5. **CI/CD Pipeline** - GitHub Actions / GitLab CI

---

**Happy Dockerizing! 🚀**
