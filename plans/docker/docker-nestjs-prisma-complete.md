# Docker, Prisma, NestJS --- Complete Dev → Production Guide

------------------------------------------------------------------------

## 1. Visual Architecture (Logical)

    Developer (VS Code)
            |
            v
    ┌───────────────────────┐
    │ NestJS API (Docker)   │  ← Port 3000
    │ - REST / GraphQL      │
    │ - Prisma Client       │
    └───────────┬───────────┘
                |
                v
    ┌──────────────────────────────┐
    │ PostgreSQL (Docker)           │
    │ Redis (Docker)                │
    └───────────┬──────────────────┘
                |
                v
    ┌──────────────────────────────┐
    │ Background Worker (Docker)    │
    │ - BullMQ / Queues             │
    │ - Cron Jobs                   │
    └──────────────────────────────┘

------------------------------------------------------------------------

## 2. Updated docker-compose.yml (Dev)

``` yaml
version: "3.9"

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  api:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - .:/app
    command: sh -c "npm install && npm run start:dev"
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/app_db
      REDIS_HOST: redis
      REDIS_PORT: 6379

  worker:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - .:/app
    command: sh -c "npm install && npm run worker"
    depends_on:
      - redis
      - db
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/app_db
      REDIS_HOST: redis
      REDIS_PORT: 6379

volumes:
  pgdata:
```

------------------------------------------------------------------------

## 3. NestJS Background Worker (BullMQ)

``` ts
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }),
  ],
})
export class WorkerModule {}
```

------------------------------------------------------------------------

## 4. Production Dockerfile (NestJS)

``` dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

------------------------------------------------------------------------

## 5. CI/CD -- GitHub Actions

``` yaml
name: CI Pipeline

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: docker build -t myapp .
```

------------------------------------------------------------------------

## 6. Prisma Studio (Dev Only)

``` bash
npx prisma studio
```

Open: http://localhost:5555

------------------------------------------------------------------------

## 7. When to Scale

  Stage        Tool
  ------------ --------------------
  Local Dev    Docker Compose
  MVP Prod     Single Docker Host
  Growth       Docker Swarm
  Enterprise   Kubernetes

------------------------------------------------------------------------

## 8. Final Principle

> Docker standardizes execution. Kubernetes standardizes scale.
