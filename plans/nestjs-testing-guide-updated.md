
# 🧪 Production-Grade Testing Setup for NestJS Backend

This guide provides a complete testing architecture for a **production-ready NestJS backend**, including:

- Test strategy
- Folder structure
- Unit, Integration, and E2E configurations
- Mocking Prisma and TypeORM
- CI/CD pipeline setup

---

# 📁 Recommended Test Folder Structure

```
src/
│
├── modules/
│   ├── user/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── __tests__/
│   │       ├── user.service.spec.ts        # Unit tests
│   │       └── user.controller.int.spec.ts # Integration tests
│
test/
├── e2e/
│   ├── auth.e2e-spec.ts
│   ├── user-flow.e2e-spec.ts
│   └── jest-e2e.json
│
jest.config.ts
jest.integration.json
jest.unit.json
```

---

# ⚙️ 1️⃣ Unit Test Configuration

### jest.unit.json
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\.spec\.ts$",
  "transform": { "^.+\.(t|j)s$": "ts-jest" },
  "coverageDirectory": "../coverage/unit",
  "testEnvironment": "node"
}
```

Run:
```bash
npm run test:unit
```

Package.json script:
```json
"test:unit": "jest --config jest.unit.json"
```

---

# 🔗 2️⃣ Integration Test Configuration

### jest.integration.json
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testRegex": ".int.spec.ts$",
  "transform": { "^.+\.(t|j)s$": "ts-jest" },
  "coverageDirectory": "./coverage/integration",
  "testEnvironment": "node"
}
```

Run:
```bash
npm run test:integration
```

---

# 🌍 3️⃣ E2E Test Configuration

### test/e2e/jest-e2e.json
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\.(t|j)s$": "ts-jest" },
  "testEnvironment": "node"
}
```

Package.json:
```json
"test:e2e": "jest --config ./test/e2e/jest-e2e.json"
```

---

# 🧠 Mocking Prisma Properly

### prisma.service.mock.ts
```ts
export const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};
```

### user.service.spec.ts
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { prismaMock } from './prisma.service.mock';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should return user by id', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 1, name: 'Test' });

    const user = await service.getUser(1);
    expect(user.name).toBe('Test');
  });
});
```

---

# 🧠 Mocking TypeORM Properly

### mock-typeorm.ts
```ts
export const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});
```

### service test
```ts
import { getRepositoryToken } from '@nestjs/typeorm';

providers: [
  UserService,
  {
    provide: getRepositoryToken(User),
    useFactory: mockRepository,
  },
];
```

---

# 🚀 Sample Integration Test

```ts
it('POST /users should create user', async () => {
  const res = await request(app.getHttpServer())
    .post('/users')
    .send({ name: 'Rohan', email: 'rohan@test.com' });

  expect(res.status).toBe(201);
});
```

---

# 🔥 Sample E2E Test

```ts
it('Login flow', async () => {
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'test@mail.com', password: '123456' });

  expect(login.status).toBe(200);
});
```

---

# 🤖 CI/CD Pipeline (GitHub Actions)

### .github/workflows/test.yml
```yaml
name: Run Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
```

---

# ✅ Final Production Checklist

✔ Unit tests for all business logic  
✔ Integration tests for DB & modules  
✔ E2E tests for critical flows  
✔ Prisma/TypeORM mocked properly  
✔ CI pipeline auto-running tests  
✔ Minimum 80% coverage target  

---

End of Guide.


---

# 📊 Test Coverage Reporting

### Update jest configs

Add coverage settings in **jest.unit.json** and **jest.integration.json**:

```json
"collectCoverage": true,
"coverageReporters": ["text", "lcov", "html"],
"coverageDirectory": "./coverage"
```

### Run coverage

```bash
npm run test:unit -- --coverage
```

### View report

Open:
```
coverage/lcov-report/index.html
```

🎯 **Target:** Minimum 80% coverage (focus on logic, not boilerplate)

---

# 🐳 Docker Setup for NestJS App

### Dockerfile

```Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

CMD ["node", "dist/main.js"]
```

---

# 🗄️ Docker Compose (App + Database)

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
    env_file:
      - .env

  db:
    image: postgres:14
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_db
    ports:
      - "5432:5432"
```

Run app:
```bash
docker-compose up --build
```

---

# 🧪 Docker Test Database Setup

Use a **separate DB** for integration/E2E tests.

### docker-compose.test.yml

```yaml
version: '3.8'

services:
  test-db:
    image: postgres:14
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test_db
    ports:
      - "5433:5432"
```

Run test DB:
```bash
docker-compose -f docker-compose.test.yml up -d
```

### .env.test

```
DATABASE_URL=postgresql://test:test@localhost:5433/test_db
```

---

# 🌱 Seed Script for Integration Tests

### prisma/seed.ts (Prisma Example)

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      email: 'seed@test.com',
      name: 'Seed User',
    },
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
```

Run seed before tests:

```bash
npx prisma db push
npx ts-node prisma/seed.ts
```

---

# 🔁 Auto-Seed in Integration Tests

```ts
beforeAll(async () => {
  await seedTestDatabase(); // custom function calling seed logic
});
```

---

# 🧼 Test DB Cleanup After Tests

```ts
afterAll(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User" RESTART IDENTITY CASCADE;`);
  await prisma.$disconnect();
});
```

---

# 🧠 TypeORM Seed Example

```ts
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';

export async function seed(dataSource: DataSource) {
  const repo = dataSource.getRepository(User);
  await repo.save({ name: 'Seed User', email: 'seed@test.com' });
}
```

---

# 🧪 CI Update to Include Test DB

Update GitHub Actions:

```yaml
services:
  postgres:
    image: postgres:14
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test_db
    ports:
      - 5432:5432
```

And add:

```yaml
- run: npx prisma db push
- run: npx ts-node prisma/seed.ts
```

---

# 🏁 You Now Have

✅ Coverage reporting  
✅ Dockerized app  
✅ Dockerized test database  
✅ Seed scripts for reliable integration tests  
✅ CI running tests with real DB  

Your NestJS backend is now **production-grade testing ready** 🚀
