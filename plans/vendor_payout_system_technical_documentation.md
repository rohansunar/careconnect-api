# Vendor Payout System - Technical Documentation

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Database Schema](#2-database-schema)
3. [Admin Manual Payout Workflow](#3-admin-manual-payout-workflow)
4. [API Endpoint Specifications](#4-api-endpoint-specifications)
5. [Edge Case Handling](#5-edge-case-handling)
6. [Error Handling](#6-error-handling)
7. [Logging Requirements](#7-logging-requirements)
8. [Notification Systems](#8-notification-systems)
9. [Security Considerations](#9-security-considerations)
10. [Testing Strategies](#10-testing-strategies)

---

## 1. System Overview

### 1.1 Purpose

This document describes the admin-driven manual vendor payout system. Unlike automated payout systems, this implementation requires administrators to manually review and process all vendor payouts through direct bank transfers. This provides full control and oversight over all financial transactions.

### 1.2 Core Design Principles

| Principle | Application |
|-----------|-------------|
| **Manual Control** | All payouts require admin action to initiate and complete |
| **Admin-Centric** | Vendors cannot self-initiate payouts; admins manage the entire process |
| **Single Responsibility** | Each service handles one specific domain |
| **Framework Agnostic** | Business logic separated from framework code |

### 1.3 System Architecture

```
src/
├── payout/                         # Main Payout Module
│   ├── payout.module.ts            # Module definition
│   ├── constants/                  # Payout-specific constants
│   │   └── payout-status.constants.ts
│   ├── dto/                        # Data Transfer Objects
│   │   ├── generate-payout.dto.ts
│   │   ├── process-payout.dto.ts
│   │   ├── payout-query.dto.ts
│   │   └── payout-response.dto.ts
│   ├── interfaces/                 # TypeScript interfaces
│   │   ├── payout.interface.ts
│   │   └── payout-result.interface.ts
│   ├── controllers/               # REST Controllers
│   │   ├── admin-payout.controller.ts
│   │   └── payout-history.controller.ts
│   ├── services/                  # Business Logic Services
│   │   ├── payout-generation.service.ts
│   │   ├── payout-calculation.service.ts
│   │   ├── payout-review.service.ts
│   │   └── manual-transfer.service.ts
│   └── exceptions/                # Custom Exceptions
│       ├── payout-generation.exception.ts
│       └── insufficient-balance.exception.ts
│
└── payout-notification/           # Payout Notifications (Admin Only)
    ├── payout-notification.module.ts
    └── services/
        └── admin-payout-notification.service.ts
```

### 1.4 Service Responsibilities

| Service | Responsibility |
|---------|----------------|
| `PayoutGenerationService` | Calculate vendor earnings from ledger entries, create payout records for admin review |
| `PayoutCalculationService` | Compute net payout from ledger entries, apply fees and deductions |
| `PayoutReviewService` | Admin review workflow, approval/rejection with manual bank transfer tracking |
| `ManualTransferService` | Track manual bank transfer status, record transfer completion |

---

## 2. Database Schema

### 2.1 VendorPayout Model

```prisma
enum PayoutStatus {
  INITIATED    // Payout record created, pending admin review
  APPROVED     // Approved by admin, ready for manual transfer
  PROCESSING   // Admin has initiated the bank transfer
  PAID         // Manually transferred to vendor account
  FAILED       // Transfer failed
  CANCELLED    // Cancelled by admin
}

model VendorPayout {
  id             String      @id @default(cuid())
  vendorId       String
  amount         Decimal     @db.Decimal(12, 2)
  status         PayoutStatus @default(INITIATED)
  bankReferenceId String?    // Admin records their transfer reference
  failureReason  String?     // Reason for failure
  notes          String?     // Admin notes
  transferNotes  String?     // Notes about the manual transfer
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  processedAt    DateTime?   // When transfer was completed
  periodStart    DateTime    // Start of payout period (inclusive)
  periodEnd      DateTime    // End of payout period (exclusive)
  
  vendor         Vendor      @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  
  @@index([vendorId])
  @@index([status])
  @@index([createdAt])
}
```

### 2.2 Ledger Model

```prisma
enum LedgerType {
  SALE          // Order completed - vendor earns
  PLATFORM_FEE  // Commission deducted
  REFUND        // Money returned to customer
  PAYOUT        // Settlement to vendor
}

model Ledger {
  id           String   @id @default(cuid())
  vendorId     String
  orderItemId  String
  type         LedgerType
  feeType      String
  amount       Decimal  @db.Decimal(12, 2)
  description  String?
  deliveryTimestamp DateTime?
  paymentMode  PaymentMode
  createdAt    DateTime @default(now())
   
  vendor       Vendor   @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  orderItem    OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
   
  @@index([vendorId])
  @@index([orderItemId])
  @@index([type])
  @@index([createdAt])
}
```

### 2.3 BankAccount Model

```prisma
model BankAccount {
  id                String   @id @default(uuid())
  vendorId          String
  vendor            Vendor   @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  accountNumber     String
  ifscCode          String
  bankName          String
  accountHolderName String
  upiId             String?
  isDefault         Boolean  @default(false)
  isVerified        Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @default(now())
   
  @@index([vendorId])
  @@unique([accountNumber])
}
```

### 2.4 Vendor Model

```prisma
model Vendor {
  id           String   @id @default(uuid())
  vendorNo     String   @unique
  name         String?
  businessName String?
  phone        String   @unique
  email        String?
  isActive     Boolean  @default(true)
   
  bankAccounts BankAccount[]
  ledgers      Ledger[]
  payouts      VendorPayout[]
}
```

### 2.5 Index Recommendations

| Table | Index | Purpose |
|-------|-------|---------|
| `VendorPayout` | `[vendorId, periodStart, periodEnd]` | Query payouts by vendor and date range |
| `VendorPayout` | `[status, createdAt]` | Query pending payouts for admin review |
| `VendorPayout` | `[vendorId, status]` | Get vendor's payout history by status |
| `Ledger` | `[vendorId, type, createdAt]` | Calculate vendor earnings for period |

---

## 3. Admin Manual Payout Workflow

### 3.1 Overview

The vendor payout system is entirely admin-driven. Administrators manually process all payouts by:

1. Generating payout records based on vendor earnings
2. Reviewing and approving payouts
3. Initiating manual bank transfers through their banking system
4. Recording transfer completion in the system

### 3.2 Complete Workflow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ADMIN MANUAL PAYOUT WORKFLOW                               │
└──────────────────────────────────────────────────────────────────────────────┘

1. PAYOUT GENERATION (Admin Initiated)
   ┌─────────────────────────────────────────┐
   │  POST /api/admin/payouts/generate       │
   │  { periodStart, periodEnd }            │
   └───────────────────┬─────────────────────┘
                        │
                        ▼
   ┌─────────────────────────────────────────┐
   │  Calculate Earnings Per Vendor:        │
   │  1. Query Ledger SALE entries           │
   │  2. Subtract PLATFORM_FEE               │
   │  3. Calculate net payout amount         │
   └───────────────────┬─────────────────────┘
                        │
                        ▼
   ┌─────────────────────────────────────────┐
   │  Create VendorPayout Records:           │
   │  - status: INITIATED                    │
   │  - amount: calculated net                │
   │  - periodStart, periodEnd                │
   └───────────────────┬─────────────────────┘
                        │
                        ▼
   ┌─────────────────────────────────────────┐
   │  NOTIFY: Admin receives notification    │
   │  "New payouts ready for review"          │
   └─────────────────────────────────────────┘

2. ADMIN REVIEW
   ┌─────────────────────────────────────────┐
   │  GET /api/admin/payouts                  │
   │  Lists all INITIATED payouts             │
   └───────────────────┬─────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌──────────┐  ┌──────────────┐  ┌─────────────┐
   │ VIEW     │  │ APPROVE      │  │ CANCEL      │
   │ DETAILS  │  │ & PROCESS    │  │             │
   └────┬─────┘  └──────┬───────┘  └──────┬──────┘
        │               │                 │
        ▼               ▼                 ▼
   ┌──────────┐  ┌──────────────┐  ┌─────────────┐
   │ - Vendor │  │ Update:      │  │ Update:     │
   │ - Amount │  │ APPROVED     │  │ CANCELLED   │
   │ - Period │  │ Notify admin │  │             │
   │   details│  └──────────────┘  └─────────────┘
   └──────────┘

3. MANUAL BANK TRANSFER
   ┌─────────────────────────────────────────┐
   │  Admin performs bank transfer:          │
   │  - Logs into banking portal             │
   │  - Initiates transfer to vendor account │
   │  - Obtains transfer reference ID         │
   └───────────────────┬─────────────────────┘
                        │
                        ▼
   ┌─────────────────────────────────────────┐
   │  POST /api/admin/payouts/:id/complete    │
   │  {                                      │
   │    bankReferenceId: "TXN123456",        │
   │    transferNotes: "NEFT transfer"      │
   │  }                                      │
   └───────────────────┬─────────────────────┘
                        │
                        ▼
   ┌─────────────────────────────────────────┐
   │  System Updates:                        │
   │  - status: PAID                         │
   │  - processedAt: current timestamp       │
   │  - Create ledger PAYOUT entry           │
   └─────────────────────────────────────────┘
```

### 3.3 Status Transitions

| From Status | To Status | Trigger | Notes |
|-------------|-----------|---------|-------|
| (New) | INITIATED | Payout generation | Created by admin |
| INITIATED | APPROVED | Admin approval | Ready for transfer |
| INITIATED | CANCELLED | Admin cancellation | No transfer made |
| APPROVED | PROCESSING | Admin starts transfer | Transfer initiated |
| APPROVED | FAILED | Admin marks failed | Transfer could not complete |
| PROCESSING | PAID | Admin completes transfer | Transfer successful |
| PROCESSING | FAILED | Admin marks failed | Transfer failed |

### 3.4 Detailed Process Steps

#### Step 1: Generate Payouts

```typescript
// Admin triggers payout generation
POST /api/admin/payouts/generate
{
  periodStart: "2024-01-01T00:00:00Z",
  periodEnd: "2024-01-07T23:59:59Z"
}

// Backend process:
// 1. Query all active vendors with completed orders in period
// 2. For each vendor, calculate:
//    - Total sales (Ledger SALE entries)
//    - Total platform fees (Ledger PLATFORM_FEE entries)
//    - Net payout = Sales - Platform Fees
// 3. Create VendorPayout records with status INITIATED
// 4. Send admin notification
```

#### Step 2: Admin Reviews Payouts

```typescript
// Admin views pending payouts
GET /api/admin/payouts?status=INITIATED

// Response includes:
// - Vendor name and bank details
// - Payout amount (net after fees)
// - Period covered
// - Any existing notes
```

#### Step 3: Admin Approves Payout

```typescript
// Admin approves a payout
POST /api/admin/payouts/:id/approve

// Backend:
// 1. Validate payout exists and status is INITIATED
// 2. Validate admin has permission
// 3. Update status to APPROVED
// 4. Notify admin (optional)
```

#### Step 4: Admin Completes Manual Transfer

```typescript
// Admin records manual bank transfer completion
POST /api/admin/payouts/:id/complete
{
  bankReferenceId: "NEFT-20240115-001234",
  transferNotes: "Transferred via NEFT to vendor's primary account"
}

// Backend:
// 1. Validate payout status is APPROVED or PROCESSING
// 2. Update status to PAID
// 3. Set processedAt to current timestamp
// 4. Store bankReferenceId and transferNotes
// 5. Create ledger entry (type: PAYOUT)
// 6. Send admin notification about completion
```

#### Step 5: Handle Failed Transfer

```typescript
// Admin marks transfer as failed
POST /api/admin/payouts/:id/fail
{
  failureReason: "Bank account closed",
  notes: "Vendor needs to update bank details"
}

// Backend:
// 1. Update status to FAILED
// 2. Store failure reason
// 3. Send admin notification about failure
```

---

## 4. API Endpoint Specifications

### 4.1 Payout Generation Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/admin/payouts/generate` | Generate payout records for admin review | Admin |
| `GET` | `/api/admin/payouts` | List all payouts with filtering | Admin |
| `GET` | `/api/admin/payouts/:id` | Get single payout details | Admin |
| `GET` | `/api/admin/payouts/preview` | Preview payouts without creating records | Admin |

### 4.2 Payout Processing Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/admin/payouts/:id/approve` | Approve payout for transfer | Admin |
| `POST` | `/api/admin/payouts/:id/reject` | Reject/cancel payout | Admin |
| `POST` | `/api/admin/payouts/:id/start-transfer` | Mark transfer as started | Admin |
| `POST` | `/api/admin/payouts/:id/complete` | Complete manual transfer | Admin |
| `POST` | `/api/admin/payouts/:id/fail` | Mark transfer as failed | Admin |

### 4.3 DTO Specifications

#### Generate Payout DTO

```typescript
// POST /api/admin/payouts/generate
export class GeneratePayoutDto {
  @IsOptional()
  @IsDateString()
  periodStart?: string;
  
  @IsOptional()
  @IsDateString()
  periodEnd?: string;
  
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
```

#### Process Payout DTO

```typescript
// POST /api/admin/payouts/:id/approve
export class ApprovePayoutDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

// POST /api/admin/payouts/:id/complete
export class CompleteTransferDto {
  @IsString()
  bankReferenceId: string;
  
  @IsOptional()
  @IsString()
  transferNotes?: string;
}

// POST /api/admin/payouts/:id/fail
export class FailTransferDto {
  @IsString()
  failureReason: string;
  
  @IsOptional()
  @IsString()
  notes?: string;
}
```

#### Payout Query DTO

```typescript
// GET /api/admin/payouts
export class PayoutQueryDto {
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;
  
  @IsOptional()
  @IsDateString()
  periodStart?: string;
  
  @IsOptional()
  @IsDateString()
  periodEnd?: string;
  
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;
  
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

#### Response DTOs

```typescript
export class PayoutResponseDto {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: Decimal;
  status: PayoutStatus;
  bankReferenceId?: string;
  failureReason?: string;
  notes?: string;
  transferNotes?: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export class PayoutListResponseDto {
  data: PayoutResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

## 5. Edge Case Handling

### 5.1 Duplicate Payout Prevention

| Strategy | Implementation |
|----------|----------------|
| **Database unique constraint** | Composite unique index on (vendorId, periodStart, periodEnd) |
| **Idempotency** | Check for existing payouts before creating new ones |

```typescript
async checkForDuplicatePayout(
  vendorId: string, 
  periodStart: Date, 
  periodEnd: Date
): Promise<boolean> {
  const existing = await this.prisma.vendorPayout.findFirst({
    where: {
      vendorId,
      periodStart,
      periodEnd,
      status: { notIn: [PayoutStatus.CANCELLED, PayoutStatus.FAILED] },
    },
  });
  
  return !!existing;
}
```

### 5.2 Vendor Account Status Changes

| Scenario | Handling |
|----------|----------|
| **Vendor deactivated** | Allow pending payouts to complete, skip future payouts |
| **Bank account changed** | Use bank account at time of approval |
| **Vendor deleted** | Cancel pending payouts |

### 5.3 Invalid Bank Account

| Scenario | Handling |
|----------|----------|
| **No bank account** | Mark payout as FAILED with reason "No bank account" |
| **Bank account not verified** | Mark payout as FAILED, notify admin |
| **Bank account changed mid-process** | Use account that was verified at approval time |

```typescript
async validateVendorBankAccount(vendorId: string): Promise<ValidationResult> {
  const bankAccount = await this.bankAccountService.getDefaultAccount(vendorId);
  
  if (!bankAccount) {
    return { valid: false, reason: 'No bank account on file' };
  }
  
  if (!bankAccount.isVerified) {
    return { valid: false, reason: 'Bank account not verified' };
  }
  
  return { 
    valid: true, 
    bankDetails: {
      accountNumber: bankAccount.accountNumber,
      ifscCode: bankAccount.ifscCode,
      bankName: bankAccount.bankName,
      accountHolderName: bankAccount.accountHolderName,
    }
  };
}
```

### 5.4 Zero Amount Payouts

| Scenario | Handling |
|----------|----------|
| **Vendor has no earnings** | Skip during generation (no payout record created) |
| **Platform fees exceed earnings** | Create payout with amount 0 or skip |

### 5.5 Timezone Handling

| Aspect | Implementation |
|--------|----------------|
| **Period calculation** | Use UTC internally, convert to IST for display |
| **Admin display** | All dates in ISO 8601 with timezone |
| **Ledger timestamps** | Store in UTC |

---

## 6. Error Handling

### 6.1 Custom Exception Classes

```typescript
export class PayoutGenerationException extends HttpException {
  code = 'PAYOUT_GENERATION_FAILED';
  constructor(message: string) {
    super({ code: this.code, message }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class DuplicatePayoutException extends HttpException {
  code = 'DUPLICATE_PAYOUT';
  constructor(message: string) {
    super({ code: this.code, message }, HttpStatus.CONFLICT);
  }
}

export class PayoutNotFoundException extends HttpException {
  code = 'PAYOUT_NOT_FOUND';
  constructor(message: string) {
    super({ code: this.code, message }, HttpStatus.NOT_FOUND);
  }
}

export class InvalidPayoutStateException extends HttpException {
  code = 'INVALID_PAYOUT_STATE';
  constructor(message: string) {
    super({ code: this.code, message }, HttpStatus.BAD_REQUEST);
  }
}
```

### 6.2 Error Codes

| Error Code | HTTP Status | Message | Recovery |
|------------|-------------|---------|----------|
| `PAYOUT_GENERATION_FAILED` | 500 | Failed to generate payouts | Check logs, retry |
| `DUPLICATE_PAYOUT` | 409 | Payout already exists for period | Use existing payout |
| `PAYOUT_NOT_FOUND` | 404 | Payout not found | Verify payout ID |
| `INVALID_PAYOUT_STATE` | 400 | Invalid state transition | Check current status |
| `INVALID_BANK_ACCOUNT` | 400 | Bank account invalid | Update bank details |
| `UNAUTHORIZED` | 401 | Not authorized | Check permissions |

---

## 7. Logging Requirements

### 7.1 Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| **ERROR** | System errors | Database connection failed |
| **WARN** | Unexpected but handled | Duplicate payout attempt |
| **INFO** | Business milestones | Payout generated, approved, completed |
| **DEBUG** | Development debugging | Query parameters |

### 7.2 Structured Logging

```typescript
@Injectable()
export class PayoutLoggerService {
  private readonly logger = new Logger(PayoutLoggerService.name);
  
  logPayoutGenerated(data: {
    payoutId: string;
    vendorId: string;
    amount: Decimal;
    periodStart: Date;
    periodEnd: Date;
  }): void {
    this.logger.log({
      event: 'PAYOUT_GENERATED',
      payoutId: data.payoutId,
      vendorId: data.vendorId,
      amount: data.amount.toString(),
      periodStart: data.periodStart.toISOString(),
      periodEnd: data.periodEnd.toISOString(),
      timestamp: new Date().toISOString(),
    });
  }
  
  logPayoutApproved(data: {
    payoutId: string;
    approvedBy: string;
  }): void {
    this.logger.log({
      event: 'PAYOUT_APPROVED',
      payoutId: data.payoutId,
      approvedBy: data.approvedBy,
      timestamp: new Date().toISOString(),
    });
  }
  
  logPayoutCompleted(data: {
    payoutId: string;
    bankReferenceId: string;
    completedBy: string;
  }): void {
    this.logger.log({
      event: 'PAYOUT_COMPLETED',
      payoutId: data.payoutId,
      bankReferenceId: data.bankReferenceId,
      completedBy: data.completedBy,
      timestamp: new Date().toISOString(),
    });
  }
  
  logPayoutFailed(data: {
    payoutId: string;
    failureReason: string;
    updatedBy: string;
  }): void {
    this.logger.error({
      event: 'PAYOUT_FAILED',
      payoutId: data.payoutId,
      failureReason: data.failureReason,
      updatedBy: data.updatedBy,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 8. Notification Systems

### 8.1 Admin Notifications Only

All notifications in this system are sent to administrators only. Vendors do not receive notifications about payout status changes - the admin manages the entire process manually.

| Event | Channel | Recipients | Template |
|-------|---------|-------------|----------|
| Payout Generated | Dashboard + Email | Admins | "New payout batch generated. Payouts: {count}, Total Amount: ₹{amount}" |
| Payout Approved | Dashboard | Admins | "Payout #{id} approved for vendor {vendor}" |
| Payout Completed | Dashboard + Email | Admins | "Payout #{id} completed. Bank Reference: {reference}, Vendor: {vendor}" |
| Payout Failed | Dashboard + Email | Admins | "Payout #{id} failed. Reason: {reason}, Vendor: {vendor}" |
| Payout Cancelled | Dashboard | Admins | "Payout #{id} cancelled" |

### 8.2 Notification Implementation

```typescript
@Injectable()
export class AdminPayoutNotificationService {
  constructor(
    private readonly emailService: EmailService,
    private readonly dashboardService: DashboardNotificationService,
  ) {}
  
  async notifyPayoutGenerated(
    payoutCount: number,
    totalAmount: Decimal
  ): Promise<void> {
    // Notify admin about new payouts ready for review
    await Promise.all([
      this.dashboardService.send({
        type: 'PAYOUT_GENERATED',
        title: 'New Payouts Ready',
        message: `${payoutCount} payout(s) ready for review. Total: ₹${totalAmount}`,
        priority: 'normal',
      }),
      this.emailService.send({
        to: process.env.ADMIN_EMAIL,
        subject: 'New Vendor Payouts Ready for Review',
        template: 'payout-generated',
        variables: {
          payoutCount,
          totalAmount: totalAmount.toString(),
        },
      }),
    ]);
  }
  
  async notifyPayoutCompleted(
    payoutId: string,
    vendorName: string,
    amount: Decimal,
    bankReferenceId: string
  ): Promise<void> {
    // Notify admin about completed payout
    await Promise.all([
      this.dashboardService.send({
        type: 'PAYOUT_COMPLETED',
        title: 'Payout Completed',
        message: `Payout of ₹${amount} for ${vendorName} completed. Reference: ${bankReferenceId}`,
        priority: 'normal',
      }),
      this.emailService.send({
        to: process.env.ADMIN_EMAIL,
        subject: `Payout Completed: ${vendorName}`,
        template: 'payout-completed',
        variables: {
          payoutId,
          vendorName,
          amount: amount.toString(),
          bankReferenceId,
        },
      }),
    ]);
  }
  
  async notifyPayoutFailed(
    payoutId: string,
    vendorName: string,
    amount: Decimal,
    failureReason: string
  ): Promise<void> {
    // Notify admin about failed payout
    await Promise.all([
      this.dashboardService.send({
        type: 'PAYOUT_FAILED',
        title: 'Payout Failed',
        message: `Payout of ₹${amount} for ${vendorName} failed. Reason: ${failureReason}`,
        priority: 'high',
      }),
      this.emailService.send({
        to: process.env.ADMIN_EMAIL,
        subject: `URGENT: Payout Failed - ${vendorName}`,
        template: 'payout-failed',
        variables: {
          payoutId,
          vendorName,
          amount: amount.toString(),
          failureReason,
        },
      }),
    ]);
  }
}
```

### 8.3 Notification Events Summary

| Notification | Sent To | Trigger |
|-------------|---------|---------|
| Payout Generated | Admin | Admin generates payout batch |
| Payout Approved | Admin | Admin approves a payout |
| Payout Started | Admin | Admin starts manual transfer |
| Payout Completed | Admin | Admin marks transfer as complete |
| Payout Failed | Admin | Admin marks transfer as failed |
| Payout Cancelled | Admin | Admin cancels a payout |

---

## 9. Security Considerations

### 9.1 Authentication

| Endpoint Type | Authentication Method |
|---------------|---------------------|
| Admin endpoints | JWT Bearer Token + Role (ADMIN) |

```typescript
// Admin guard
@Injectable()
export class AdminPayoutGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return user?.role === 'ADMIN' && user.permissions.includes('payout:manage');
  }
}
```

### 9.2 Authorization

| Action | Required Permission |
|--------|---------------------|
| Generate payouts | `payout:generate` |
| View payouts | `payout:read` |
| Approve payout | `payout:approve` |
| Reject payout | `payout:reject` |
| Complete transfer | `payout:complete` |
| View all payouts | `payout:read:all` |

### 9.3 Data Encryption

| Data Type | Protection Level |
|-----------|-----------------|
| Bank account numbers | Encrypted at rest (AES-256) |
| IFSC codes | Plain text (not sensitive) |
| Payout amounts | Not sensitive |
| API responses | HTTPS only |

### 9.4 API Security

| Security Measure | Implementation |
|-----------------|----------------|
| Rate limiting | 100 requests/minute for admin |
| Input validation | class-validator with strict DTOs |
| SQL injection | Prisma parameterized queries |

---

## 10. Testing Strategies

### 10.1 Unit Tests

```typescript
describe('PayoutCalculationService', () => {
  let service: PayoutCalculationService;
  let mockPrisma: Partial<PrismaService>;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PayoutCalculationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    
    service = module.get<PayoutCalculationService>(PayoutCalculationService);
  });
  
  describe('calculateVendorEarnings', () => {
    it('should calculate correct earnings for vendor', async () => {
      const vendorId = 'vendor-123';
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-08');
      
      mockPrisma.ledger = {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Decimal(10000) },
        }),
      } as any;
      
      mockPrisma.platformFees = {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Decimal(1000) },
        }),
      } as any;
      
      const result = await service.calculateVendorEarnings(
        vendorId,
        periodStart,
        periodEnd
      );
      
      expect(result.totalSales).toEqual(new Decimal(10000));
      expect(result.platformFees).toEqual(new Decimal(1000));
      expect(result.netPayout).toEqual(new Decimal(9000));
    });
  });
});
```

### 10.2 Integration Tests

```typescript
describe('Payout Integration Tests', () => {
  let app: INestApplication;
  let adminToken: string;
  
  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    await app.init();
    adminToken = await getAdminToken();
  });
  
  describe('POST /api/admin/payouts/generate', () => {
    it('should generate payout records', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/payouts/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      
      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
    });
  });
  
  describe('POST /api/admin/payouts/:id/approve', () => {
    it('should approve payout', async () => {
      const payoutId = 'payout-123';
      const response = await request(app.getHttpServer())
        .post(`/api/admin/payouts/${payoutId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('APPROVED');
    });
  });
  
  describe('POST /api/admin/payouts/:id/complete', () => {
    it('should complete manual transfer', async () => {
      const payoutId = 'payout-123';
      const response = await request(app.getHttpServer())
        .post(`/api/admin/payouts/${payoutId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bankReferenceId: 'TXN-001',
          transferNotes: 'NEFT transfer',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('PAID');
      expect(response.body.data.bankReferenceId).toBe('TXN-001');
    });
  });
});
```

### 10.3 End-to-End Tests

```typescript
describe('Manual Payout E2E Tests', () => {
  const scenario = new ManualPayoutScenario();
  
  beforeEach(async () => {
    await scenario.setup();
  });
  
  afterEach(async () => {
    await scenario.teardown();
  });
  
  it('complete admin manual payout workflow', async () => {
    // 1. Create test orders with completed deliveries
    await scenario.createOrders(10);
    
    // 2. Admin generates payout batch
    const payouts = await scenario.generatePayouts();
    expect(payouts).toHaveLengthGreaterThan(0);
    
    // 3. Admin reviews and approves payout
    const payout = payouts[0];
    await scenario.approvePayout(payout.id);
    
    // 4. Admin performs manual bank transfer
    await scenario.completeTransfer(payout.id, {
      bankReferenceId: 'NEFT-001',
      transferNotes: 'Manual transfer completed',
    });
    
    // 5. Verify payout status
    const updatedPayout = await scenario.getPayout(payout.id);
    expect(updatedPayout.status).toBe('PAID');
    expect(updatedPayout.bankReferenceId).toBe('NEFT-001');
    
    // 6. Verify ledger entry created
    const ledgerEntries = await scenario.getLedgerEntries(payout.vendorId);
    expect(ledgerEntries).toContainEqual(
      expect.objectContaining({ type: 'PAYOUT' })
    );
  });
});
```

### 10.4 Test Cases

| Test Case | Description |
|-----------|--------------|
| Generate payout for new period | Generate payouts for a period with no existing payouts |
| Duplicate generation prevention | Try generating payouts for same period twice |
| Approve payout | Admin approves an INITIATED payout |
| Reject payout | Admin rejects an INITIATED payout |
| Complete transfer | Admin marks transfer as complete with reference |
| Mark transfer failed | Admin marks transfer as failed |
| Invalid state transition | Try to complete an INITIATED payout (not APPROVED) |
| Concurrent approval | Try approving same payout from two admins |
| Bank account validation | Payout fails if vendor has no verified bank account |

---

## Appendix: Implementation Checklist

- [ ] Create `PayoutModule` with all services
- [ ] Implement database migrations for new models
- [ ] Implement `PayoutGenerationService`
- [ ] Implement `PayoutCalculationService`
- [ ] Implement `PayoutReviewService`
- [ ] Implement `ManualTransferService`
- [ ] Create admin controllers and endpoints
- [ ] Implement admin notification service
- [ ] Add structured logging throughout
- [ ] Create unit tests for all services
- [ ] Create integration tests for API endpoints
- [ ] Set up E2E test scenarios
- [ ] Configure monitoring and alerts
