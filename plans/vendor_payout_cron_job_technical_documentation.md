# Weekly Automated Vendor Payout Cron Job - Technical Documentation

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Trigger Schedule and Timing Configuration](#2-trigger-schedule-and-timing-configuration)
3. [Payout Calculation Logic](#3-payout-calculation-logic)
4. [Vendor Data Query Process](#4-vendor-data-query-process)
5. [Payout Record Insertion Mechanism](#5-payout-record-insertion-mechanism)
6. [Data Validation and Error Handling](#6-data-validation-and-error-handling)
7. [Edge Case Handling](#7-edge-case-handling)
8. [Data Models and Schema Relationships](#8-data-models-and-schema-relationships)
9. [Logging Requirements](#9-logging-requirements)
10. [Notification and Alerting Mechanisms](#10-notification-and-alerting-mechanisms)
11. [Retry Logic and Failure Recovery](#11-retry-logic-and-failure-recovery)
12. [Performance Considerations and Optimization](#12-performance-considerations-and-optimization)
13. [Security Measures](#13-security-measures)

---

## 1. System Overview

### 1.1 Purpose

This document describes the weekly automated payout cron job system that calculates and processes vendor payouts without manual intervention. The system operates on a scheduled basis, automatically identifying eligible vendors, calculating their earnings, and creating payout records for processing.

### 1.2 Core Design Principles

| Principle | Application |
|-----------|-------------|
| **Automation First** | All payouts are generated and processed automatically on schedule |
| **Idempotency** | Duplicate payouts are prevented through unique constraints and idempotency checks |
| **Fault Tolerance** | Partial failures are handled gracefully with retry mechanisms |
| **Auditability** | Complete audit trail through structured logging |
| **Atomicity** | Transactions ensure data consistency across ledger and payout records |

### 1.3 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WEEKLY AUTOMATED PAYOUT SYSTEM                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  SCHEDULER LAYER                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  VendorPayoutCronService                                               │ │
│  │  - @Cron(CronExpression.EVERY_WEEK)                                    │ │
│  │  - Triggers every Sunday at 12:00 AM UTC                               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROCESSOR LAYER                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────────┐ │
│  │ VendorQueryService│  │PayoutCalculator │  │ PayoutRecordService        │ │
│  │                  │  │ Service          │  │                            │ │
│  │ - Query active   │  │ - Calculate      │  │ - Create payout records   │ │
│  │   vendors       │  │   earnings       │  │ - Handle duplicates       │ │
│  │ - Get ledger    │  │ - Apply fees     │  │ - Insert to database      │ │
│  │   entries       │  │ - Net amount     │  │                            │ │
│  └──────────────────┘  └──────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  VALIDATION LAYER                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────────┐ │
│  │ ValidationService│  │ BankAccount     │  │ EdgeCaseHandler           │ │
│  │                  │  │ Validator       │  │                            │ │
│  │ - Validate       │  │ - Verify bank   │  │ - Handle zero balance    │ │
│  │   vendor data    │  │   accounts      │  │ - Handle pending items   │ │
│  │ - Validate       │  │ - Check         │  │ - Handle duplicates      │ │
│  │   amounts        │  │   verification  │  │                            │ │
│  └──────────────────┘  └──────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION LAYER                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────────┐ │
│  │ AdminAlertService│  │ VendorNotif     │  │ MonitoringAlertService     │ │
│  │                  │  │ Service         │  │                            │ │
│  │ - Send alerts   │  │ - Notify vendor │  │ - System monitoring       │ │
│  │   on failures   │  │   of payout     │  │ - Anomaly detection       │ │
│  │ - Send summary  │  │                 │  │                            │ │
│  └──────────────────┘  └──────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Service Responsibilities

| Service | Responsibility |
|---------|----------------|
| `VendorPayoutCronService` | Orchestrates the weekly payout process, manages cron trigger and coordinates workflow |
| `VendorQueryService` | Queries eligible vendors and retrieves their ledger entries for the payout period |
| `PayoutCalculatorService` | Calculates net payout amounts from ledger entries, applies fees and deductions |
| `PayoutRecordService` | Creates and manages payout records in the database, handles idempotency |
| `PayoutValidationService` | Validates vendor data, bank accounts, and payout amounts before processing |
| `PayoutNotificationService` | Sends notifications to admins and vendors about payout status |
| `PayoutRetryService` | Handles retry logic and failure recovery for failed payouts |

---

## 2. Trigger Schedule and Timing Configuration

### 2.1 Cron Expression Configuration

The weekly automated payout cron job uses NestJS Schedule module with the following configuration:

| Property | Value |
|----------|-------|
| **Cron Expression** | `CronExpression.EVERY_WEEK` or `0 0 * * 0` |
| **Default Execution Time** | Sunday 12:00 AM UTC |
| **Timezone** | UTC (recommended for consistency) |
| **Execution Environment** | Production server only |

### 2.2 Configuration Parameters

The cron job should be configurable through environment variables to allow flexibility without code changes:

| Environment Variable | Description | Default Value |
|---------------------|-------------|---------------|
| `PAYOUT_CRON_ENABLED` | Enable/disable automated payouts | `true` |
| `PAYOUT_CRON_DAY_OF_WEEK` | Day of week for payout (0-6, Sunday = 0) | `0` |
| `PAYOUT_CRON_HOUR` | Hour of day for payout (0-23) | `0` |
| `PAYOUT_CRON_MINUTE` | Minute of hour for payout (0-59) | `0` |
| `PAYOUT_CRON_TIMEZONE` | Timezone for cron execution | `UTC` |
| `PAYOUT_ENABLED_DAYS` | Comma-separated days vendor must be active | `MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY` |

### 2.3 Payout Period Calculation

The payout period is calculated automatically based on the cron execution time:

| Parameter | Calculation |
|-----------|-------------|
| **Period Start** | Previous cron execution time (7 days ago at execution time) |
| **Period End** | Current cron execution time |
| **Example** | If cron runs at 2024-01-07 00:00 UTC, period is 2023-12-31 00:00 to 2024-01-07 00:00 UTC |

### 2.4 Manual Trigger Support

For testing and emergency scenarios, a manual trigger endpoint should be available:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/payouts/cron/trigger` | Manually trigger the weekly payout process |
| `GET` | `/api/admin/payouts/cron/status` | Get status of last/current payout run |

### 2.5 Lock Mechanism

To prevent concurrent executions of the payout cron job:

| Mechanism | Implementation |
|-----------|----------------|
| **Distributed Lock** | Use database-based lock or Redis to prevent multiple instances from running simultaneously |
| **Lock Key** | `payout:cron:weekly:{executionDate}` |
| **Lock Timeout** | 1 hour (3600 seconds) |
| **Lock Retry** | If lock acquisition fails, skip execution and log warning |

---

## 3. Payout Calculation Logic

### 3.1 Calculation Formula

The net payout amount for each vendor is calculated using the following formula:

```
Net Payout = Total Sales Revenue - Platform Fees - Adjustments + Pending Credits
```

Where:

| Component | Description | Source |
|-----------|-------------|--------|
| **Total Sales Revenue** | Sum of all SALE ledger entries for the period | Ledger (type: SALE) |
| **Platform Fees** | Sum of all PLATFORM_FEE ledger entries for the period | Ledger (type: PLATFORM_FEE) |
| **Adjustments** | Sum of manual adjustments (refunds, corrections) | Ledger (type: REFUND) |
| **Pending Credits** | Any pending credits to be added | Manual configuration |

### 3.2 Detailed Calculation Steps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PAYOUT CALCULATION WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

1. QUERY LEDGER ENTRIES
   │
   ├── Query SALE entries for vendor in period
   │   SELECT SUM(amount) FROM Ledger 
   │   WHERE vendorId = ? AND type = 'SALE' 
   │   AND createdAt >= periodStart AND createdAt < periodEnd
   │
   ├── Query PLATFORM_FEE entries for vendor in period
   │   SELECT SUM(amount) FROM Ledger 
   │   WHERE vendorId = ? AND type = 'PLATFORM_FEE' 
   │   AND createdAt >= periodStart AND createdAt < periodEnd
   │
   └── Query REFUND entries for vendor in period
       SELECT SUM(amount) FROM Ledger 
       WHERE vendorId = ? AND type = 'REFUND' 
       AND createdAt >= periodStart AND createdAt < periodEnd

2. CALCULATE TOTALS
   │
   ├── TotalSales = SUM(SALE.amount)
   ├── TotalFees = SUM(PLATFORM_FEE.amount)
   ├── TotalRefunds = SUM(REFUND.amount)
   │
   └── NetPayout = TotalSales - TotalFees - TotalRefunds

3. APPLY BUSINESS RULES
   │
   ├── If NetPayout <= 0: Skip payout (log as zero-balance)
   ├── If NetPayout > 0 AND NetPayout < MinimumPayoutThreshold: 
   │   Hold until cumulative amount exceeds threshold
   └── If NetPayout >= MinimumPayoutThreshold: Process payout
```

### 3.3 Required Fields for Calculation

The payout calculation requires the following fields from each data model:

#### From Ledger Model

| Field | Type | Usage |
|-------|------|-------|
| `vendorId` | String | Group entries by vendor |
| `type` | LedgerType | Filter by SALE, PLATFORM_FEE, REFUND |
| `amount` | Decimal | Sum amounts for calculation |
| `createdAt` | DateTime | Filter by payout period |
| `orderItemId` | String | Cross-reference with orders |
| `description` | String | Audit trail for adjustments |

#### From Vendor Model

| Field | Type | Usage |
|-------|------|-------|
| `id` | String | Unique identifier |
| `vendorNo` | String | Vendor reference |
| `name` | String | Display name for notifications |
| `business_name` | String | Business name for payouts |
| `is_active` | Boolean | Check vendor is active |

#### From BankAccount Model

| Field | Type | Usage |
|-------|------|-------|
| `vendorId` | String | Link to vendor |
| `accountNumber` | String | Destination account |
| `ifscCode` | String | Bank routing |
| `bankName` | String | Bank name for records |
| `accountHolderName` | String | Account holder |
| `isDefault` | Boolean | Select default account |
| `isVerified` | Boolean | Verify account is verified |

### 3.4 Minimum Payout Threshold

| Parameter | Value | Description |
|-----------|-------|-------------|
| `MINIMUM_PAYOUT_AMOUNT` | 100.00 INR | Minimum amount to trigger payout |
| `HOLD_THRESHOLD_AMOUNT` | 100.00 INR | Amount below this is held until threshold met |

Vendors with calculated payouts below the minimum threshold should have their amounts accumulated for the next payout cycle.

### 3.5 Currency Handling

| Aspect | Implementation |
|--------|----------------|
| **Base Currency** | INR (Indian Rupee) |
| **Decimal Precision** | 2 decimal places |
| **Storage** | Decimal(12, 2) in database |
| **Display** | Format with currency symbol (₹) |
| **Calculation** | Use Decimal type to avoid floating-point errors |

---

## 4. Vendor Data Query Process

### 4.1 Query Strategy

The vendor data query process follows a multi-step approach:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VENDOR QUERY WORKFLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: Identify Eligible Vendors
   │
   └── Query vendors WHERE:
       ├── is_active = true
       ├── is_available_today = true (optional)
       └── Has delivered orders in period OR has ledger entries

STEP 2: Filter by Active Status
   │
   └── Exclude vendors WHERE:
       ├── is_active = false
       ├── Deleted vendors
       └── Vendors flagged for suspension

STEP 3: Check for Ledger Entries
   │
   └── For each vendor, check:
       └── SELECT COUNT(*) FROM Ledger 
           WHERE vendorId = ? AND createdAt >= periodStart AND createdAt < periodEnd

STEP 4: Get Bank Account Details
   │
   └── Query BankAccount WHERE:
       ├── vendorId = ?
       └── isDefault = true (or get first verified account)

STEP 5: Calculate Payout Amount
   │
   └── For each vendor with ledger entries:
       └── Execute calculation logic (Section 3)
```

### 4.2 Query Optimization

| Optimization | Implementation |
|--------------|----------------|
| **Batch Processing** | Process vendors in batches of 100 to avoid memory issues |
| **Index Usage** | Ensure indexes on vendorId, createdAt, and type fields |
| **Pagination** | Use cursor-based pagination for large datasets |
| **Caching** | Cache vendor static data during execution |

### 4.3 Query Filters

| Filter | Condition | Purpose |
|--------|-----------|---------|
| Active Vendors | `is_active = true` | Only process active vendors |
| Has Earnings | `Ledger entries exist in period` | Only process vendors with activity |
| Verified Bank Account | `BankAccount.isVerified = true` | Only process vendors with verified accounts |
| Exclude Suspended | `suspended_at IS NULL` | Exclude suspended vendors |

### 4.4 Query Parameters

The vendor query should accept the following parameters:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `periodStart` | DateTime | Yes | Calculated | Start of payout period |
| `periodEnd` | DateTime | Yes | Calculated | End of payout period |
| `includeInactive` | Boolean | No | false | Include inactive vendors |
| `vendorIds` | String[] | No | null | Specific vendors to process |
| `batchSize` | Number | No | 100 | Number of vendors per batch |

---

## 5. Payout Record Insertion Mechanism

### 5.1 Insertion Process

The payout record insertion follows this workflow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PAYOUT RECORD INSERTION WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

1. PRE-INSERT VALIDATION
   │
   ├── Check for existing payout (idempotency)
   │   SELECT * FROM VendorPayout 
   │   WHERE vendorId = ? AND periodStart = ? AND periodEnd = ?
   │
   ├── Validate vendor exists and is active
   │   SELECT * FROM Vendor WHERE id = ? AND is_active = true
   │
   ├── Validate bank account exists and is verified
   │   SELECT * FROM BankAccount 
   │   WHERE vendorId = ? AND isVerified = true
   │
   └── Validate amount is positive
       └── netPayout > 0

2. DATABASE TRANSACTION
   │
   ├── Begin transaction
   │
   ├── Insert VendorPayout record
   │   INSERT INTO VendorPayout (
   │     id, vendorId, amount, status,
   │     periodStart, periodEnd,
   │     createdAt, updatedAt
   │   ) VALUES (?, ?, 'INITIATED', ?, ?, NOW(), NOW())
   │
   ├── Create ledger entry (optional)
   │   INSERT INTO Ledger (
   │     id, vendorId, orderItemId, type,
   │     feeType, amount, description,
   │     paymentMode, createdAt
   │   ) VALUES (?, ?, NULL, 'PAYOUT', 'WEEKLY_PAYOUT', ?, ?, 'SYSTEM', NOW())
   │
   └── Commit transaction

3. POST-INSERT ACTIONS
   │
   ├── Log successful insertion
   ├── Trigger notification (if configured)
   └── Update vendor's last payout date
```

### 5.2 Idempotency Handling

| Strategy | Implementation |
|----------|----------------|
| **Unique Constraint** | Composite unique index on (vendorId, periodStart, periodEnd) |
| **Pre-check** | Query for existing payout before insert |
| **Upsert Logic** | Use `upsert` operation to handle race conditions |
| **Idempotency Key** | Generate deterministic ID from period and vendor |

### 5.3 Record Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (CUID) | Yes | Unique identifier |
| `vendorId` | String | Yes | Reference to vendor |
| `amount` | Decimal(12,2) | Yes | Net payout amount |
| `status` | PayoutStatus | Yes | INITIATED (default) |
| `periodStart` | DateTime | Yes | Start of period (inclusive) |
| `periodEnd` | DateTime | Yes | End of period (exclusive) |
| `bankReferenceId` | String | No | Bank transfer reference |
| `failureReason` | String | No | Reason if failed |
| `notes` | String | No | Internal notes |
| `transferNotes` | String | No | Transfer notes |
| `createdAt` | DateTime | Yes | Record creation time |
| `updatedAt` | DateTime | Yes | Last update time |
| `processedAt` | DateTime | No | When payout was processed |

### 5.4 Transaction Atomicity

| Aspect | Implementation |
|--------|----------------|
| **ACID Compliance** | Use database transactions for all payout creations |
| **Rollback** | Rollback on any failure during insert |
| **Isolation Level** | READ_COMMITTED or REPEATABLE_READ |
| **Locking** | Use row-level locks on vendor records during processing |

---

## 6. Data Validation and Error Handling

### 6.1 Validation Rules

#### Vendor Validation

| Rule | Condition | Error Handling |
|------|-----------|-----------------|
| Vendor Exists | Vendor record exists | Throw `VendorNotFoundException` |
| Vendor Active | `is_active = true` | Skip vendor, log warning |
| Vendor Not Suspended | `suspended_at IS NULL` | Skip vendor, log warning |
| Vendor Has Name | `name IS NOT NULL` | Use vendorNo as fallback |

#### Bank Account Validation

| Rule | Condition | Error Handling |
|------|-----------|-----------------|
| Bank Account Exists | At least one bank account | Skip payout, mark as FAILED |
| Account Verified | `isVerified = true` | Skip payout, mark as FAILED |
| Account Not Closed | Account status active | Skip payout, mark as FAILED |
| Account Number Valid | Valid format | Skip payout, mark as FAILED |

#### Amount Validation

| Rule | Condition | Error Handling |
|------|-----------|-----------------|
| Amount Positive | `amount > 0` | Skip payout (zero-balance) |
| Amount Not Null | `amount IS NOT NULL` | Skip payout, log error |
| Amount Within Limits | `amount <= MAX_PAYOUT_LIMIT` | Split into multiple payouts |
| Decimal Precision | Max 2 decimal places | Round appropriately |

### 6.2 Error Categories

| Category | Description | Response |
|----------|-------------|----------|
| **Validation Error** | Invalid input data | Skip vendor, continue with others |
| **Database Error** | Database connection or query failure | Retry with exponential backoff |
| **External Service Error** | Payment gateway failure | Mark as FAILED, notify admin |
| **Configuration Error** | Missing configuration | Stop execution, alert immediately |
| **Business Rule Violation** | Business rule not met | Skip vendor, log reason |

### 6.3 Error Response Structure

```typescript
// Error response for failed payout
interface PayoutError {
  vendorId: string;
  vendorName: string;
  errorCode: string;
  errorMessage: string;
  attemptedAt: Date;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

### 6.4 Global Error Handler

| Component | Responsibility |
|-----------|----------------|
| `PayoutErrorInterceptor` | Catches and formats all payout-related errors |
| `PayoutErrorFilter` | Handles HTTP errors in payout controllers |
| `ErrorNotificationService` | Sends immediate alerts for critical errors |

---

## 7. Edge Case Handling

### 7.1 Zero-Balance Vendors

| Scenario | Handling |
|----------|----------|
| **Vendor has no sales in period** | Skip payout, do not create record |
| **Platform fees equal sales (Net = 0)** | Skip payout, log as zero-balance |
| **Net payout is negative** | Create record with amount 0, log warning |
| **Accumulated balance below threshold** | Hold payout, accumulate for next period |

### 7.2 Vendors with Pending Adjustments

| Scenario | Handling |
|----------|----------|
| **Pending refunds** | Exclude from current period, include in next |
| **Disputed orders** | Hold payout until dispute resolved |
| **Pending platform fee calculation** | Wait for calculation to complete |
| **Manual adjustments pending** | Process only approved adjustments |

### 7.3 Currency Conversion Scenarios

| Scenario | Handling |
|----------|----------|
| **Single currency (INR)** | No conversion needed, use direct amounts |
| **Future multi-currency support** | Store original currency, convert at payout time |
| **Exchange rate changes during period** | Use weighted average rate |
| **Conversion failure** | Use base currency, log warning |

### 7.4 Partial Payment Failures

| Scenario | Handling |
|----------|----------|
| **Bank transfer fails** | Mark payout as FAILED, store failure reason |
| **Partial amount transferred** | Record actual transferred amount,差异 |
| **Timeout during transfer** | Check payment gateway status, retry if needed |
| **Vendor bank account closed** | Mark FAILED, notify vendor to update account |

### 7.5 Duplicate Prevention

| Mechanism | Implementation |
|-----------|----------------|
| **Unique Constraint** | Database-level unique index on (vendorId, periodStart, periodEnd) |
| **Application Check** | Query for existing payout before creating |
| **Idempotency Key** | Generate deterministic ID |
| **Upsert Operation** | Use upsert to handle race conditions |
| **Logging** | Log all duplicate attempts for audit |

### 7.6 Transaction Atomicity

| Scenario | Handling |
|----------|----------|
| **Database failure during insert** | Rollback entire transaction |
| **Partial success in batch** | Use savepoints for each vendor |
| **Concurrent execution** | Use distributed lock to prevent |
| **Application crash** | Transaction auto-rollbacks |
| **Network timeout** | Retry with idempotency check |

### 7.7 Additional Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Vendor deactivated mid-process** | Complete current payout, skip future |
| **Bank account changed during period** | Use account verified at period end |
| **Vendor merges/acquisitions** | Handle as separate payouts |
| **Legal hold on vendor** | Skip until hold lifted |
| **Tax compliance pending** | Withhold until tax documents received |

---

## 8. Data Models and Schema Relationships

### 8.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Vendor       │       │  VendorPayout   │       │    Ledger       │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │──┐    │ id              │    ┌──│ id              │
│ vendorNo        │  │    │ vendorId        │◄───┤  │ vendorId        │
│ name            │  │    │ amount          │    │  │ orderItemId     │
│ business_name   │  └───►│ status          │    │  │ type            │
│ phone           │       │ periodStart    │    │  │ feeType         │
│ email           │       │ periodEnd      │    │  │ amount          │
│ is_active       │       │ createdAt      │    │  │ createdAt       │
└─────────────────┘       │ processedAt    │    │  └─────────────────┘
                         └─────────────────┘    │
                              │                   │
                              │                   │
                              ▼                   ▼
                         ┌─────────────────┐       ┌─────────────────┐
                         │  BankAccount   │       │   OrderItem    │
                         ├─────────────────┤       ├─────────────────┤
                         │ id              │       │ id              │
                         │ vendorId        │──────►│ orderId         │
                         │ accountNumber   │       │ productId       │
                         │ ifscCode        │       │ quantity        │
                         │ bankName        │       │ price           │
                         │ isVerified      │       └─────────────────┘
                         │ isDefault       │
                         └─────────────────┘
```

### 8.2 Schema Details

#### VendorPayout Model

| Field | Type | Constraints | Description |
|-------|------|-------------|--------------|
| `id` | String | PK, CUID | Unique identifier |
| `vendorId` | String | FK, NOT NULL | Reference to Vendor |
| `amount` | Decimal(12,2) | NOT NULL | Payout amount |
| `status` | PayoutStatus | NOT NULL, DEFAULT: INITIATED | Current status |
| `bankReferenceId` | String | NULLABLE | Bank transfer reference |
| `failureReason` | String | NULLABLE | Failure description |
| `notes` | String | NULLABLE | Internal notes |
| `transferNotes` | String | NULLABLE | Transfer notes |
| `periodStart` | DateTime | NOT NULL | Period start (inclusive) |
| `periodEnd` | DateTime | NOT NULL | Period end (exclusive) |
| `createdAt` | DateTime | DEFAULT: NOW() | Creation timestamp |
| `updatedAt` | DateTime | AUTO UPDATE | Last update timestamp |
| `processedAt` | DateTime | NULLABLE | Processing timestamp |

#### Indexes for VendorPayout

| Index | Fields | Purpose |
|-------|--------|---------|
| `vendor_payout_vendor_id_idx` | vendorId | Query by vendor |
| `vendor_payout_status_idx` | status | Query by status |
| `vendor_payout_created_at_idx` | createdAt | Query by date |
| `vendor_payout_unique_period` | vendorId, periodStart, periodEnd | Prevent duplicates |

#### Ledger Model (Relevant Fields)

| Field | Type | Constraints | Description |
|-------|------|-------------|--------------|
| `id` | String | PK, CUID | Unique identifier |
| `vendorId` | String | FK, NOT NULL | Reference to Vendor |
| `orderItemId` | String | FK, NOT NULL | Reference to OrderItem |
| `type` | LedgerType | NOT NULL | Entry type (SALE, PLATFORM_FEE, REFUND, PAYOUT) |
| `feeType` | String | NOT NULL | Specific fee category |
| `amount` | Decimal(12,2) | NOT NULL | Amount (positive for credit, negative for debit) |
| `description` | String | NULLABLE | Entry description |
| `paymentMode` | PaymentMode | NOT NULL | Payment method |
| `deliveryTimestamp` | DateTime | NULLABLE | Delivery time |
| `createdAt` | DateTime | DEFAULT: NOW() | Creation timestamp |

#### Indexes for Ledger

| Index | Fields | Purpose |
|-------|--------|---------|
| `ledger_vendor_id_idx` | vendorId | Query by vendor |
| `ledger_type_idx` | type | Query by type |
| `ledger_created_at_idx` | createdAt | Query by date range |
| `ledger_order_item_id_idx` | orderItemId | Query by order |

### 8.3 Foreign Key Relationships

| Relationship | From | To | On Delete |
|--------------|------|----|-----------|
| Vendor → VendorPayout | vendorId | id | CASCADE |
| VendorPayout → Vendor | vendorId | id | RESTRICT |
| Vendor → Ledger | vendorId | id | CASCADE |
| Ledger → Vendor | vendorId | id | RESTRICT |
| Vendor → BankAccount | vendorId | id | CASCADE |

---

## 9. Logging Requirements

### 9.1 Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| **ERROR** | System errors requiring immediate attention | Database connection failed |
| **WARN** | Unexpected but handled situations | Duplicate payout detected, skipped |
| **INFO** | Business milestones | Payout batch started, completed |
| **DEBUG** | Development debugging | Query parameters, intermediate results |

### 9.2 Structured Log Format

All logs must include structured data for easy querying and analysis:

```typescript
interface PayoutLogEntry {
  timestamp: string;        // ISO 8601 format
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  event: string;           // Event type
  service: string;         // Service name
  vendorId?: string;       // Optional vendor context
  payoutId?: string;      // Optional payout context
  periodStart?: string;    // Payout period start
  periodEnd?: string;     // Payout period end
  amount?: string;        // Payout amount
  duration?: number;      // Execution duration in ms
  errorCode?: string;     // Error code if applicable
  message: string;       // Human-readable message
  metadata?: object;      // Additional context
}
```

### 9.3 Required Log Events

| Event | Level | Trigger | Required Fields |
|-------|-------|---------|-----------------|
| `PAYOUT_CRON_STARTED` | INFO | Cron job execution begins | periodStart, periodEnd, expectedVendorCount |
| `PAYOUT_CRON_COMPLETED` | INFO | Cron job execution completes | totalProcessed, totalAmount, duration |
| `PAYOUT_CRON_FAILED` | ERROR | Cron job fails | error, stack, duration |
| `VENDOR_PROCESSING` | DEBUG | Starting vendor processing | vendorId, expectedAmount |
| `VENDOR_COMPLETED` | DEBUG | Vendor processing complete | vendorId, payoutId, amount |
| `VENDOR_SKIPPED` | WARN | Vendor skipped | vendorId, reason |
| `PAYOUT_CREATED` | INFO | Payout record created | payoutId, vendorId, amount |
| `PAYOUT_FAILED` | ERROR | Payout processing failed | payoutId, vendorId, reason |
| `LEDGER_ENTRY_CREATED` | DEBUG | Ledger entry created | ledgerId, vendorId, type, amount |
| `VALIDATION_FAILED` | WARN | Validation check failed | vendorId, validationType, reason |
| `BANK_TRANSFER_INITIATED` | INFO | Bank transfer started | payoutId, vendorId, amount |
| `BANK_TRANSFER_COMPLETED` | INFO | Bank transfer completed | payoutId, bankReferenceId |
| `BANK_TRANSFER_FAILED` | ERROR | Bank transfer failed | payoutId, failureReason |
| `DUPLICATE_DETECTED` | WARN | Duplicate payout detected | vendorId, periodStart, periodEnd |
| `IDEMPOTENCY_CHECK` | DEBUG | Idempotency check result | vendorId, existingPayoutId, action |

### 9.4 Audit Trail Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Immutable Logs** | Logs should not be modifiable after creation |
| **Retention** | Retain for 7 years for financial compliance |
| **Log Aggregation** | Use centralized logging (ELK, CloudWatch, etc.) |
| **Correlation IDs** | Include correlation ID across all related logs |
| **Sensitive Data** | Never log bank account numbers, only last 4 digits |

### 9.5 Log Storage Strategy

| Log Type | Storage | Retention |
|----------|---------|-----------|
| Application Logs | File/CloudWatch | 90 days |
| Audit Logs | Separate persistent storage | 7 years |
| Error Logs | Alert aggregation system | 1 year |
| Performance Logs | Metrics system | 30 days |

---

## 10. Notification and Alerting Mechanisms

### 10.1 Notification Events

#### Admin Notifications

| Event | Channel | Priority | Content |
|-------|---------|----------|---------|
| Payout Batch Started | Dashboard, Email | Normal | "Weekly payout process started. Period: {start} to {end}. Vendors: {count}" |
| Payout Batch Completed | Dashboard, Email | Normal | "Weekly payout completed. Total: {amount}, Vendors: {count}, Failed: {failed}" |
| Payout Batch Failed | Dashboard, Email, SMS | Critical | "Weekly payout FAILED. Error: {error}. Manual intervention required." |
| High Failure Rate | Dashboard, Email | High | "Warning: {percentage}% payouts failed. Threshold: 5%" |
| Payout Delayed | Dashboard | Medium | "Payout processing delayed by {minutes} minutes" |

#### Vendor Notifications

| Event | Channel | Priority | Content |
|-------|---------|----------|---------|
| Payout Initiated | Push Notification, Email | Normal | "Your payout of ₹{amount} has been initiated. Period: {period}" |
| Payout Processed | Push Notification, Email | Normal | "Your payout of ₹{amount} has been processed. Reference: {ref}" |
| Payout Failed | Push Notification, Email, SMS | High | "Your payout of ₹{amount} failed. Reason: {reason}. Please update bank details." |

### 10.2 Alert Thresholds

| Alert Type | Threshold | Action |
|------------|-----------|--------|
| **Critical Failure** | Any payout batch fails completely | Immediate SMS to on-call |
| **High Failure Rate** | > 5% of payouts fail | Email to admin within 15 minutes |
| **Partial Failure** | 1-5% of payouts fail | Dashboard notification |
| **Processing Delay** | > 30 minutes since start | Dashboard notification |
| **Amount Anomaly** | Payout > 2x average | Manual review required |
| **Zero Payouts** | No payouts processed | Warning notification |

### 10.3 Alert Channels

| Channel | Use Case | Configuration |
|---------|----------|---------------|
| Email | Standard notifications | Configurable SMTP |
| SMS | Critical alerts only | Twilio/AWS SNS |
| Push Notification | Vendor notifications | Firebase/OneSignal |
| Dashboard | All notifications | Real-time WebSocket |
| Slack/Teams | DevOps alerts | Webhook integration |

### 10.4 Escalation Matrix

| Severity | Response Time | Escalation Path |
|----------|--------------|-----------------|
| Critical | 15 minutes | On-call → Team Lead → VP Engineering |
| High | 1 hour | Team Lead → Engineering Manager |
| Medium | 4 hours | Engineering Manager |
| Low | 24 hours | Queue for next business day |

---

## 11. Retry Logic and Failure Recovery

### 11.1 Retry Strategy

| Failure Type | Retry Behavior | Max Retries | Backoff |
|--------------|----------------|-------------|---------|
| Database Connection | Retry immediately | 3 | Linear (1s, 2s, 3s) |
| Payment Gateway Timeout | Wait then retry | 3 | Exponential (5s, 10s, 20s) |
| Bank Transfer Failed | Wait then retry | 2 | Exponential (10s, 30s) |
| Validation Error | No retry | 0 | N/A |
| Unknown Error | Log and skip | 1 | Linear (5s) |

### 11.2 Retry Implementation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RETRY FLOW DIAGRAM                                        │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────┐
                         │  Execute Payout  │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
            ┌──────────────┐           ┌──────────────────┐
            │   SUCCESS   │           │      FAILED      │
            └─────────────┘           └────────┬─────────┘
                                              │
                                  ┌───────────┴───────────┐
                                  │                       │
                                  ▼                       ▼
                          ┌──────────────┐       ┌─────────────────┐
                          │ Retryable?   │       │  Non-Retryable  │
                          └───────┬──────┘       └─────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
            ┌──────────────┐           ┌──────────────────┐
            │ Retry Count  │           │  Mark as FAILED  │
            │ < Max?      │           │  Log Error       │
            └───────┬──────┘           │  Send Alert      │
                    │                  └──────────────────┘
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
   ┌────────────┐     ┌────────────────┐
   │ Wait with  │     │  Max Retries   │
   │ Backoff    │     │  Exceeded      │
   └─────┬──────┘     └───────┬────────┘
         │                     │
         └─────────┬───────────┘
                   │
                   ▼
            ┌──────────────┐
            │  Retry       │
            │  Execution  │
            └─────────────┘
```

### 11.3 Failure Recovery Procedures

| Failure Scenario | Recovery Procedure |
|-----------------|-------------------|
| **Database Failure** | 1. Check database connectivity 2. Retry with backoff 3. If persistent, pause and alert |
| **Payment Gateway Failure** | 1. Check gateway status 2. Retry pending payouts 3. Switch to backup gateway if available |
| **Bank Transfer Failure** | 1. Verify bank account 2. Retry with different method 3. Mark as FAILED, notify vendor |
| **Partial Batch Failure** | 1. Continue with remaining vendors 2. Log failed vendors 3. Retry failed after main batch |
| **Application Crash** | 1. Check last processed vendor 2. Resume from checkpoint 3. Verify idempotency |

### 11.4 Checkpoint and Resume

| Checkpoint Type | Implementation |
|-----------------|----------------|
| **Vendor Checkpoint** | Track last successfully processed vendor ID |
| **Batch Checkpoint** | Store batch progress in database |
| **Recovery Point** | Use last committed transaction as recovery point |

### 11.5 Dead Letter Queue

Failed payouts that cannot be processed after all retries should be moved to a dead letter queue:

| Field | Description |
|-------|--------------|
| `payoutId` | Original payout ID |
| `vendorId` | Vendor ID |
| `failureReason` | Reason for failure |
| `retryCount` | Number of retries attempted |
| `lastAttempt` | Timestamp of last attempt |
| `nextRetry` | Scheduled next retry (if applicable) |
| `manualReview` | Flag for manual review required |

---

## 12. Performance Considerations and Optimization

### 12.1 Batch Processing

| Parameter | Value | Description |
|-----------|-------|-------------|
| `BATCH_SIZE` | 100 | Vendors processed per batch |
| `BATCH_DELAY` | 100ms | Delay between batches |
| `CONCURRENT_DB_OPS` | 10 | Concurrent database operations |
| `LEDGER_QUERY_BATCH` | 1000 | Ledger entries per query |

### 12.2 Query Optimization

| Optimization | Implementation |
|--------------|----------------|
| **Use Indexes** | Ensure indexes on vendorId, createdAt, type |
| **Select Specific Fields** | Avoid SELECT * |
| **Cursor Pagination** | Use cursor-based pagination for large datasets |
| **Batch Queries** | Combine multiple queries into single batch |
| **Connection Pooling** | Configure appropriate pool size |

### 12.3 Caching Strategy

| Cache Type | TTL | Invalidation |
|------------|-----|--------------|
| Vendor Bank Details | 1 hour | On bank account change |
| Platform Fee Rates | 24 hours | On fee configuration change |
| Vendor Active Status | 5 minutes | On vendor status change |
| Payout Period Data | Until batch complete | After payout completion |

### 12.4 Memory Management

| Consideration | Implementation |
|---------------|----------------|
| **Stream Large Results** | Use cursor-based iteration instead of loading all |
| **Limit Array Sizes** | Process in chunks to avoid memory exhaustion |
| **Clear References** | Release database connections promptly |
| **Monitor Memory** | Set up alerts for memory usage > 80% |

### 12.5 Performance Monitoring

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Payout Processing Time | < 30 minutes for 1000 vendors | > 45 minutes |
| Database Query Time | < 100ms average | > 500ms |
| Memory Usage | < 512MB | > 800MB |
| CPU Usage | < 70% average | > 90% |
| Error Rate | < 1% | > 5% |

### 12.6 Scalability Considerations

| Aspect | Recommendation |
|--------|----------------|
| **Horizontal Scaling** | Run cron on single instance with distributed lock |
| **Database Sharding** | Consider by vendor region if needed |
| **Read Replicas** | Use for ledger queries |
| **Message Queues** | Consider for very large vendor counts (>10,000) |

---

## 13. Security Measures

### 13.1 Data Protection

| Data Type | Protection Level | Implementation |
|-----------|-------------------|----------------|
| Bank Account Numbers | Highly Sensitive | Encrypt at rest (AES-256) |
| IFSC Codes | Low Sensitivity | Plain text storage allowed |
| Payout Amounts | Medium Sensitivity | Access controlled |
| Vendor Personal Info | Medium Sensitivity | Access controlled |
| API Keys/Secrets | Critical | Environment variables, secrets manager |

### 13.2 Encryption Requirements

| Encryption Level | Data | Algorithm |
|-----------------|------|-----------|
| **At Rest** | Bank account numbers | AES-256-GCM |
| **In Transit** | All API communications | TLS 1.3 |
| **Application** | Sensitive configuration | AES-256 |

### 13.3 Access Control

| Role | Permissions |
|------|-------------|
| **System Account** | Execute cron, read/write payout records |
| **Admin** | View payouts, approve manual, view details |
| **Finance** | View all, export reports, manage adjustments |
| **Vendor** | View own payouts only |

### 13.4 Audit Requirements

| Requirement | Implementation |
|-------------|----------------|
| **All Payout Actions** | Log every state change |
| **Admin Actions** | Log with admin ID |
| **API Access** | Log all API calls with user context |
| **Configuration Changes** | Log all config modifications |
| **Failed Access Attempts** | Log and alert after 3 failures |

### 13.5 Compliance Considerations

| Compliance | Requirement |
|------------|-------------|
| **PCI DSS** | Do not store full bank card details |
| **Data Retention** | Retain payout records for 7 years |
| **GDPR/PDPA** | Allow vendor data export on request |
| **Financial Audit** | Maintain complete audit trail |

### 13.6 Security Checklist

- [ ] All bank account data encrypted at rest
- [ ] TLS 1.3 for all external communications
- [ ] API authentication required for all endpoints
- [ ] Role-based access control implemented
- [ ] Audit logging for all financial transactions
- [ ] Regular security reviews and penetration testing
- [ ] Secrets rotated regularly
- [ ] Database access limited to application user
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] No sensitive data in logs
- [ ] Backup encryption enabled

---

## Appendix: Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] Configure cron schedule with environment variables
- [ ] Implement distributed lock mechanism
- [ ] Set up database indexes
- [ ] Configure logging infrastructure

### Phase 2: Vendor Query Service

- [ ] Implement vendor eligibility query
- [ ] Implement ledger entry aggregation
- [ ] Add bank account validation
- [ ] Handle zero-balance vendors

### Phase 3: Payout Calculation

- [ ] Implement calculation formula
- [ ] Add minimum payout threshold logic
- [ ] Implement currency handling
- [ ] Add adjustment processing

### Phase 4: Record Insertion

- [ ] Implement idempotency checks
- [ ] Add transaction management
- [ ] Implement error handling
- [ ] Add duplicate prevention

### Phase 5: Notifications

- [ ] Implement admin alerts
- [ ] Implement vendor notifications
- [ ] Configure alert thresholds
- [ ] Set up escalation matrix

### Phase 6: Retry and Recovery

- [ ] Implement retry logic with backoff
- [ ] Add checkpoint/resume capability
- [ ] Implement dead letter queue
- [ ] Add manual recovery options

### Phase 7: Testing and Monitoring

- [ ] Unit tests for all services
- [ ] Integration tests for API
- [ ] Load testing
- [ ] Performance monitoring setup

---

## Related Documentation

- [Vendor Payout System - Technical Documentation](./vendor_payout_system_technical_documentation.md) - Admin manual payout workflow
- [Vendor Earnings PRD](./vendor_earnings_prd.md) - Business requirements
- [Wallet System Technical Design](./wallet_system_technical_design.md) - Related financial systems
