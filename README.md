# Water Delivery API

[![License: UNLICENSED](https://img.shields.io/badge/License-UNLICENSED-red.svg)](https://opensource.org/licenses/UNLICENSED)

A comprehensive NestJS-based API for managing water delivery services, including user authentication, subscription management, order processing, cart functionality, and automated order generation from subscriptions.

## Table of Contents

- [Description](#description)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Setup](#setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Database Management](#database-management)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Additional Documentation](#additional-documentation)
- [License](#license)

---

## Description

This API provides backend services for a water delivery platform, supporting multiple user roles (customers, vendors, admins) with features like:

- ✅ User authentication and authorization
- ✅ Subscription management with automated billing
- ✅ Order creation and processing
- ✅ Cart management
- ✅ Location-based services
- ✅ Payment integration with Razorpay
- ✅ Notification system
- ✅ Automated order generation from subscriptions

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL with Prisma ORM |
| Queue | BullMQ with Redis |
| Server | Fastify |
| Authentication | JWT with Passport |
| Validation | class-validator |
| Documentation | Swagger/OpenAPI |
| Image Processing | Sharp |
| Notifications | Twilio, Resend |
| Payment Gateway | Razorpay |

---

## Installation

🔧 To install dependencies, run:

```bash
$ npm install
```

---

## Setup

⚠️ **Important**: Ensure you have PostgreSQL and Redis set up before proceeding.

1. Copy `example.env` to `.env` and configure your environment variables.
2. Set up PostgreSQL database and Redis instance.
3. Run Prisma migrations:

   ```bash
   $ npm run prisma:migrate
   ```

4. Generate Prisma client:

   ```bash
   $ npm run prisma:generate
   ```

5. (Optional) Seed initial data:

   ```bash
   $ npm run seed:data
   ```

> **Note**: Step 5 is optional and can be skipped if you prefer to start with an empty database.

---

## Running the Application

```bash
# development
$ npm run start:dev

# production
$ npm run start:prod

# debug mode
$ npm run start:debug
```

The API will be available at `http://localhost:3000` by default.

---

## API Documentation

Once the application is running, visit `http://localhost:3000/api` for Swagger documentation.

---

## Testing

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov

# test with debug
$ npm run test:debug
```

---

## Database Management

```bash
# Build Prisma schema
$ npm run prisma:build

# Open Prisma Studio
$ npm run prisma:studio

# Validate schema
$ npm run prisma:validate

# Generate client
$ npm run prisma:generate
```

---

## Deployment

This NestJS application can be deployed to various platforms. For production deployment:

1. Build the application:
   ```bash
   $ npm run build
   ```

2. Use PM2 or similar process manager for production:
   ```bash
   $ npm install -g pm2
   $ pm2 start dist/main.js
   ```

For detailed deployment guides, refer to the [NestJS deployment documentation](https://docs.nestjs.com/deployment).

---

## Project Structure

```
src/
├── app/                    # Main application module
├── auth/                   # Authentication and authorization
├── cart/                   # Shopping cart functionality
├── customer/               # Customer management
├── vendor/                 # Vendor management
├── admin/                  # Admin functionality
├── order/                  # Order processing and management
├── subscription/           # Subscription services
├── location/               # Location-based services
├── address/                # Address management
├── notification/           # Notification system
├── common/                 # Shared utilities and services
└── main.ts                 # Application entry point
```

---

## Additional Documentation

### Order Generation Process

<details>
<summary>🔍 Click to expand detailed order generation process documentation</summary>

The order generation process is a critical automated system designed to create orders from active subscriptions based on their predefined delivery frequencies. This process ensures that recurring deliveries are handled efficiently without manual intervention, improving reliability and customer satisfaction.

#### Purpose
- Automate the creation of orders for subscriptions to reduce manual effort and errors.
- Ensure timely deliveries by scheduling order generation based on subscription frequencies.
- Decouple order creation from user interactions for better system performance.

#### Key Principles
- **Automation**: Uses cron jobs and queue-based processing for regular, asynchronous execution.
- **Reliability**: Includes validation checks, error handling, and retry mechanisms.
- **Scalability**: Employs queuing to handle load without blocking the main application.
- **Data Integrity**: Prevents duplicate orders and ensures all necessary data is validated before order creation.

#### Architecture

The order generation system follows a modular architecture leveraging NestJS, BullMQ, and Prisma. It consists of the following components:

**Core Components**
- **OrderGenerationService**: The main service class responsible for business logic, including subscription fetching, validation, order creation, and scheduling updates.
- **OrderGenerationProcessor**: A BullMQ processor that handles asynchronous job processing for order generation tasks.
- **Queue System**: BullMQ queue named 'order-generation' for decoupling and load management.
- **Database Layer**: Prisma ORM for type-safe database operations.
- **Scheduling Layer**: NestJS cron jobs for periodic execution.

**Dependencies**
- **PrismaService**: For database access.
- **NotificationService**: For admin notifications on errors or special cases.
- **DeliveryFrequencyService**: For calculating next delivery dates based on frequency rules.
- **OrderNumberService**: For generating unique order numbers.

#### Workflow Steps

1. **Periodic Check (Cron Job)**: Runs every 10 seconds to fetch active subscriptions ready for order generation.
2. **Job Enqueuing**: Adds jobs to the queue for each eligible subscription.
3. **Job Processing**: Asynchronous processing of order creation.
4. **Order Creation Logic**: Validates subscription, creates order, updates delivery dates.
5. **Rescheduling (If Needed)**: Handles vendor unavailability by rescheduling.

For detailed documentation, see [`src/order/docs/order-generation-process.md`](src/order/docs/order-generation-process.md).

### Rider Endpoint Additions (Feb 2026)
- New rider self-service and delivery flows are documented in `docs/rider-endpoints.md`, including sample requests/responses for:
  - `PUT /riders/me` (update email/address)
  - `POST /rider/orders/:id/verify-delivery-otp`
  - `POST /rider/orders/:id/cancel`

</details>

---

## License

UNLICENSED
