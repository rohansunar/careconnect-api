# Subscription Codebase Technical Documentation

**Generated:** 2026-02-25  
**Module Location:** `/src/subscription`

---

## Table of Contents

1. [Code Organization and File Structure](#code-organization-and-file-structure)
2. [Main Components and Responsibilities](#main-components-and-responsibilities)
3. [Data Models and Database Schema](#data-models-and-database-schema)
4. [API Endpoints and Behavior](#api-endpoints-and-behavior)
5. [Existing Features and Business Logic](#existing-features-and-business-logic)
6. [Dependencies and Integration Points](#dependencies-and-integration-points)
7. [Design Patterns Used](#design-patterns-used)
8. [Areas of Complexity and Simplification Opportunities](#areas-of-complexity-and-simplification-opportunities)

---

## 1. Code Organization and File Structure

```
src/subscription/
├── subscription.module.ts              # Main NestJS module definition
├── config/
│   └── payment-mode.config.json       # Payment mode configuration storage
├── controllers/
│   ├── admin-subscription.controller.ts    # Admin API endpoints
│   └── customer-subscription.controller.ts # Customer API endpoints
├── dto/
│   ├── create-subscription.dto.ts     # Subscription creation DTO
│   └── update-subscription.dto.ts     # Subscription update DTO
├── interfaces/
│   ├── delivery-frequency.interface.ts        # Delivery frequency enums and interfaces
│   ├── delivery-frequency-strategy.interface.ts # Strategy pattern interfaces
│   ├── payment-mode.interface.ts       # Payment mode interfaces
│   ├── price-calculation.interface.ts  # Price calculation interfaces
│   ├── subscription-repository.interface.ts  # Repository interface
│   └── subscription-validation.interface.ts  # Validation interfaces
├── repositories/
│   └── subscription.repository.ts     # Prisma-based subscription repository
├── services/
│   ├── admin-subscription.service.ts      # Admin subscription service
│   ├── customer-subscription.service.ts    # Customer subscription service
│   ├── delivery-frequency.service.ts      # Delivery frequency orchestration
│   ├── payment-mode.service.ts            # Payment mode management
│   ├── price-calculation.service.ts        # Price calculation orchestration
│   ├── subscription-validation.service.ts  # Input validation service
│   ├── delivery-frequency/
│   │   ├── delivery-frequency.factory.ts      # Factory for frequency strategies
│   │   ├── daily-frequency.service.ts         # Daily delivery strategy
│   │   ├── alternate-frequency.service.ts     # Alternate days strategy
│   │   └── custom-frequency.service.ts        # Custom days strategy
│   ├── handlers/
│   │   └── on-payment-success-subscription.handler.ts  # Event handler
│   ├── payment-mode/
│   │   └── payment-mode.repository.ts    # File-based config persistence
│   └── price-calculation/
│       ├── price-calculator.factory.ts   # Factory for price calculators
│       ├── daily-price-calculator.ts     # Daily price calculation
│       ├── alternate-price-calculator.ts # Alternate days price calc
│       ├── custom-price-calculator.ts    # Custom days price calc
│       └── date-utils.ts                 # Date utility functions
```

---

## 2. Main Components and Responsibilities

### 2.1 Controllers

#### [`AdminSubscriptionController`](src/subscription/controllers/admin-subscription.controller.ts:15)
- **Path:** `/subscriptions` (admin-prefixed)
- **Role:** `admin`
- **Endpoints:**
  - `PATCH /payment-mode` - Toggle default payment mode
  - `GET /payment-mode` - Get current payment mode

#### [`CustomerSubscriptionController`](src/subscription/controllers/customer-subscription.controller.ts:29)
- **Path:** `/customer/subscriptions`
- **Role:** `customer`
- **Endpoints:**
  - `POST /` - Create new subscription
  - `GET /` - Get customer's subscriptions with pagination
  - `POST /:id/toggle` - Toggle subscription status (pause/resume)
  - `DELETE /:id` - Delete subscription

### 2.2 Core Services

#### [`CustomerSubscriptionService`](src/subscription/services/customer-subscription.service.ts:61)
Main business logic for customer subscription operations:
- **createSubscription()** - Validates inputs, calculates price, creates payment, stores subscription
- **getMySubscriptions()** - Retrieves paginated subscriptions with filtering
- **toggleSubscriptionStatus()** - Pauses/resumes subscription
- **deleteMySubscription()** - Soft-deletes subscription

#### [`AdminSubscriptionService`](src/subscription/services/admin-subscription.service.ts:10)
Manages administrative subscription configurations:
- **togglePaymentMode()** - Switches between UPFRONT and POST_DELIVERY
- **getPaymentMode()** - Retrieves current payment mode

#### [`DeliveryFrequencyService`](src/subscription/services/delivery-frequency.service.ts:15)
Orchestrates delivery frequency validation and calculation:
- **validateFrequency()** - Validates frequency and custom days
- **getNextDeliveryDate()** - Calculates next delivery date

#### [`PriceCalculationService`](src/subscription/services/price-calculation.service.ts:14)
Handles subscription pricing:
- **calculateTotalPrice()** - Computes total subscription price

#### [`PaymentModeService`](src/subscription/services/payment-mode.service.ts:10)
Manages payment mode configuration:
- **getCurrentMode()** - Returns UPFRONT or POST_DELIVERY
- **toggleMode()** - Switches between modes

#### [`SubscriptionValidationService`](src/subscription/services/subscription-validation.service.ts:20)
Validates subscription creation inputs:
- **validateInputs()** - Checks customer address, product, and frequency validity

### 2.3 Repository

#### [`SubscriptionRepositoryService`](src/subscription/repositories/subscription.repository.ts:19)
Prisma-based data access layer:
- **findById()** - Get subscription by ID
- **findByCustomerAndProduct()** - Check for duplicates
- **create()** - Create subscription record
- **update()** - Update subscription
- **delete()** - Soft-delete (mark as DELETED)

### 2.4 Strategy Implementations

#### Delivery Frequency Strategies
- [`DailyFrequencyService`](src/subscription/services/delivery-frequency/daily-frequency.service.ts:9) - Daily deliveries
- [`AlternateFrequencyService`](src/subscription/services/delivery-frequency/alternate-frequency.service.ts:9) - Every 2 days
- [`CustomFrequencyService`](src/subscription/services/delivery-frequency/custom-frequency.service.ts:10) - Specific days of week

#### Price Calculation Strategies
- [`DailyPriceCalculator`](src/subscription/services/price-calculation/daily-price-calculator.ts:11) - Daily pricing
- [`AlternatePriceCalculator`](src/subscription/services/price-calculation/alternate-price-calculator.ts:11) - Alternate day pricing
- [`CustomPriceCalculator`](src/subscription/services/price-calculation/custom-price-calculator.ts:18) - Custom days pricing

### 2.5 Event Handlers

#### [`OnPaymentSucceededSubscriptionHandler`](src/subscription/services/handlers/on-payment-success-subscription.handler.ts:9)
- Listens to `PaymentSucceededEvent`
- Activates subscription when payment succeeds

---

## 3. Data Models and Database Schema

### 3.1 Subscription Model

Location: [`prisma/models/subscription.prisma`](prisma/models/subscription.prisma:24)

```prisma
model Subscription {
  id                 String             @id @default(uuid())
  customerAddressId  String?
  customerAddress    CustomerAddress?   @relation(fields: [customerAddressId], references: [id])
  customerId         String?
  customer           Customer?          @relation(fields: [customerId], references: [id])
  productId          String?
  product            Product?           @relation(fields: [productId], references: [id])
  quantity           Int
  frequency          SubscriptionFrequency
  custom_days        DayOfWeek[]
  next_delivery_date DateTime?
  status             SubscriptionStatus @default(PROCESSING)
  start_date         DateTime
  total_price        Float @default(0)
  payment_mode       String @default("UPFRONT")
  created_at         DateTime           @default(now())
  updated_at         DateTime           @default(now())
  price_snapshot     Float              @default(0)
  paymentId          String?
  payment            Payment? @relation("subscriptionPayment", fields: [paymentId], references: [id])

  @@index([status])
  @@index([start_date])
  @@index([created_at])
  @@index([customerId])
  @@index([productId])
  @@index([next_delivery_date])
}
```

### 3.2 Enums

```prisma
enum SubscriptionStatus {
  ACTIVE
  INACTIVE
  PROCESSING
  DELETED
}

enum SubscriptionFrequency {
  DAILY
  ALTERNATIVE_DAYS
  CUSTOM_DAYS
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}
```

### 3.3 Related Models

| Model | Relationship | Description |
|-------|-------------|-------------|
| `CustomerAddress` | One-to-Many | Subscription belongs to an address |
| `Product` | One-to-Many | Subscribed product reference |
| `Payment` | One-to-Many | Payment record for subscription |

---

## 4. API Endpoints and Behavior

### 4.1 Customer Endpoints

#### POST `/customer/subscriptions`
**Create a new subscription**

Request Body:
```typescript
{
  productId: string;      // Required - Product UUID
  quantity: number;       // Required - Quantity per delivery
  frequency: "DAILY" | "ALTERNATIVE_DAYS" | "CUSTOM_DAYS";
  start_date: string;    // Required - ISO date string
  custom_days?: DayOfWeek[];  // Required if CUSTOM_DAYS
}
```

Response (201):
```typescript
{
  id: string;             // Subscription ID
  payment: Payment;       // Payment details with razorpay order
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}
```

Business Flow:
1. Validates customer has default active address
2. Validates product exists and is `is_schedulable`
3. Validates frequency and custom days
4. Calculates next delivery date
5. Calculates total price
6. Creates Razorpay payment order
7. Creates payment record
8. Creates subscription (status: PROCESSING)
9. Returns payment details for frontend

#### GET `/customer/subscriptions`
**Get customer's subscriptions**

Query Parameters:
- `page` (optional, default: 1)
- `limit` (optional, default: 10)

Response (200):
```typescript
{
  subscriptions: Subscription[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

#### POST `/customer/subscriptions/:id/toggle`
**Toggle subscription status (pause/resume)**

Response (200): Updated subscription

#### DELETE `/customer/subscriptions/:id`
**Delete subscription (soft delete)**

Response (200): Deleted subscription

### 4.2 Admin Endpoints

#### GET `/subscriptions/payment-mode`
**Get current payment mode**

Response (200):
```typescript
{
  payment_mode: "UPFRONT" | "POST_DELIVERY";
}
```

#### PATCH `/subscriptions/payment-mode`
**Toggle payment mode**

Response (200):
```typescript
{
  message: string;
  payment_mode: string;
}
```

---

## 5. Existing Features and Business Logic

### 5.1 Subscription Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Subscription Creation Flow                     │
└─────────────────────────────────────────────────────────────────┘

1. User submits subscription data
         │
         ▼
2. SubscriptionValidationService.validateInputs()
   - Check customer has default active address
   - Verify product exists and is_schedulable = true
   - Validate frequency + custom_days
         │
         ▼
3. Validate start_date not in past
         │
         ▼
4. DeliveryFrequencyService.getNextDeliveryDate()
   - Uses strategy pattern based on frequency
         │
         ▼
5. PriceCalculationService.calculateTotalPrice()
   - Uses strategy based on frequency
   - Calculates for current month
         │
         ▼
6. Check for duplicate subscription
   - Same customer + product = Conflict
         │
         ▼
7. PaymentProviderService.initiatePayment()
   - Creates Razorpay order
         │
         ▼
8. Create Payment record (PENDING)
         │
         ▼
9. Create Subscription (PROCESSING)
         │
         ▼
10. Return payment details to frontend
```

### 5.2 Delivery Frequency Calculation

| Frequency | Behavior | Next Delivery Calculation |
|-----------|----------|---------------------------|
| DAILY | Every day | startDate + 1 day |
| ALTERNATIVE_DAYS | Every 2 days | startDate + 2 days |
| CUSTOM_DAYS | Specific days | Nearest valid day from custom_days |

### 5.3 Price Calculation

Price is calculated based on:
- **Quantity** - Items per delivery
- **Unit Price** - From product (stored as snapshot)
- **Frequency** - Determines number of deliveries
- **Start Date** - Determines billing period

The calculation considers:
- Remaining days in current month
- Fallback to next month if insufficient days
- Uses `date-fns` for date calculations

### 5.4 Payment Mode Configuration

Two payment modes supported:
- **UPFRONT** - Payment required at subscription creation
- **POST_DELIVERY** - Payment after delivery completion

Configuration stored in JSON file: `config/payment-mode.config.json`

### 5.5 Payment Processing

1. Razorpay SDK integration
2. Order creation with subscription ID in notes
3. Payment webhook handling (via PaymentService)
4. On payment success: subscription status → ACTIVE

---

## 6. Dependencies and Integration Points

### 6.1 Internal Dependencies

| Module | Integration | Purpose |
|--------|------------|---------|
| `PrismaModule` | Database | Subscription data persistence |
| `NotificationModule` | Notifications | Send notifications |
| `PaymentModule` | Payment | Payment processing |
| `@nestjs/cqrs` | Events | Payment success events |

### 6.2 External Dependencies

| Package | Purpose |
|---------|---------|
| `@prisma/client` | Database ORM |
| `razorpay` | Payment gateway |
| `date-fns` | Date calculations |
| `@nestjs/cqrs` | Event handling |

### 6.3 Configuration

```typescript
// Environment variables required
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET (optional)
```

### 6.4 Related Services

- **PaymentProviderService** - Razorpay integration
- **PrismaService** - Database access
- **EventBus (CQRS)** - Event publishing

---

## 7. Design Patterns Used

### 7.1 Factory Pattern

**Delivery Frequency Factory**
- Location: [`services/delivery-frequency/delivery-frequency.factory.ts`](src/subscription/services/delivery-frequency/delivery-frequency.factory.ts:19)
- Creates appropriate frequency strategy based on enum

**Price Calculator Factory**
- Location: [`services/price-calculation/price-calculator.factory.ts`](src/subscription/services/price-calculation/price-calculator.factory.ts:19)
- Creates appropriate price calculator based on enum

### 7.2 Strategy Pattern

**Delivery Frequency Strategies**
- `DailyFrequencyService`
- `AlternateFrequencyService`
- `CustomFrequencyService`

**Price Calculation Strategies**
- `DailyPriceCalculator`
- `AlternatePriceCalculator`
- `CustomPriceCalculator`

### 7.3 Repository Pattern

**SubscriptionRepositoryService**
- Abstracts Prisma database operations
- Provides clean interface for CRUD

### 7.4 Event-Driven Architecture

- **PaymentSucceededEvent** triggers subscription activation
- **OnPaymentSucceededSubscriptionHandler** updates status

---

## 8. Areas of Complexity and Simplification Opportunities

### 8.1 Identified Complexities

| Area | Issue | Impact |
|------|-------|--------|
| **Price Calculation** | Uses month-bound calculation; may not support full subscription period | Limited billing flexibility |
| **Custom Days Enum** | Custom `DayOfWeek` enum conflicts with Prisma enum | Mapping complexity |
| **Payment Mode Storage** | File-based JSON storage | Not persistent across deployments, race conditions in multi-instance |
| **Subscription Update** | Update DTO exists but no endpoint | Unused code |
| **Status Constants** | `SUBSCRIPTION_DELETED_STATUS` defined inline | Magic string in code |
| **Error Handling** | Some errors return generic messages | Poor debugging |
| **Duplicate Check** | Checks by customer + product only | Doesn't consider address |
| **Price Snapshot** | Stored but not used for recalculation | No price change protection |

### 8.2 Simplification Opportunities

1. **Payment Mode Persistence**
   - Current: File-based JSON
   - Suggested: Database or environment variable
   - Benefit: Deployment safety, multi-instance support

2. **Remove Unused Code**
   - `UpdateSubscriptionDto` has no endpoint
   - Can be removed or endpoint implemented

3. **Consolidate Enums**
   - Current: Separate custom and Prisma enums
   - Suggested: Use single source or generate from Prisma

4. **Price Recalculation**
   - Currently stores snapshot but doesn't use
   - Could add functionality to recalculate on product price change

5. **Error Messages**
   - Add more specific error codes/messages
   - Better debugging and user feedback

6. **Testing**
   - Add unit tests for strategies and calculators
   - Current test coverage unknown

### 8.3 Areas Needing Future Implementation

Based on existing plans and current gaps:

1. **Delivery Tracking** - No delivery model or tracking
2. **Order Generation** - Subscriptions don't auto-generate orders
3. **End-of-Month Adjustments** - Not implemented
4. **Recurring Payments** - Only initial payment supported
5. **Subscription Update Endpoint** - DTO exists but no API

---

## Appendix: File Reference Guide

| File | Lines | Purpose |
|------|-------|---------|
| [`subscription.module.ts`](src/subscription/subscription.module.ts:1) | 38 | Module definition with providers |
| [`customer-subscription.service.ts`](src/subscription/services/customer-subscription.service.ts:1) | 317 | Main business logic |
| [`subscription.repository.ts`](src/subscription/repositories/subscription.repository.ts:1) | 180 | Data access layer |
| [`delivery-frequency.factory.ts`](src/subscription/services/delivery-frequency/delivery-frequency.factory.ts:1) | 48 | Strategy factory |
| [`price-calculator.factory.ts`](src/subscription/services/price-calculation/price-calculator.factory.ts:1) | 46 | Calculator factory |
| [`payment-mode.repository.ts`](src/subscription/services/payment-mode/payment-mode.repository.ts:1) | 51 | Config persistence |
| [`subscription.prisma`](prisma/models/subscription.prisma:1) | 52 | Database model |

---

*This documentation serves as a reference for understanding the current implementation. All existing features are preserved as-is.*
