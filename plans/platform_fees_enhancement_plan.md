# Platform Fees Handler Update Plan

## Executive Summary

This document outlines the necessary changes to fix the critical bug in the [`on-order-delivered-ledger.handler.ts`](src/ledger/services/handlers/on-order-delivered-ledger.handler.ts) file where it references non-existent database fields in the PlatformFee table.

---

## Schema Analysis Results

### PlatformFee Schema ([`prisma/models/platform_fees.prisma`](prisma/models/platform_fees.prisma))

```prisma
enum FeeCalculationType {
  PERCENTAGE
  FIXED
}

model PlatformFee {
  id              String   @id @default(uuid())
  categoryId      String
  feeName         String   // e.g., "LISTING_FEE", "TRANSACTION_FEE", "GST"
  calculationType FeeCalculationType
  value           Decimal  @db.Decimal(10, 2)
  applyOnFeeCode  String?  // null = applies to order total
  effectiveFrom   DateTime
  effectiveTo     DateTime?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  categories      Categories @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  
  @@index([categoryId])
  @@index([feeName])
}
```

**Key Schema Observations:**
- Uses `feeName` (not `feeCode`) as the fee identifier field
- Has `calculationType` enum supporting both PERCENTAGE and FIXED calculations
- Includes `applyOnFeeCode` for chained fee calculations (e.g., GST on transaction fee)
- Has validity period fields (`effectiveFrom`, `effectiveTo`) for time-based fee configuration
- Has `isActive` flag for enabling/disabling fee records
- `value` field stores the numeric fee value (percentage or fixed amount)

---

## Discrepancies Between Original Plan and Actual Implementation

### Discrepancy #1: Field Name Mismatch

| Original Plan Stated | Actual Schema | Impact |
|---------------------|---------------|--------|
| `feeCode` | `feeName` | Handler cannot query by correct field |
| N/A | `calculationType` | Unused feature - supports FIXED fees |
| N/A | `applyOnFeeCode` | Unused feature - supports chained calculations |

### Discrepancy #2: PlatformFeeCode Enum Does Not Exist

- The original plan mentioned a `PlatformFeeCode` enum was added to align with `PlatformFeeType` in `ledger.prisma`
- **Actual:** Neither `PlatformFeeCode` nor `PlatformFeeType` exist in any Prisma schema file
- The handler imports `PlatformFeeType` from `@prisma/client` which may be from legacy data or needs to be defined

### Discrepancy #3: Handler Uses Old Field Names

The handler at [`on-order-delivered-ledger.handler.ts:47-51`](src/ledger/services/handlers/on-order-delivered-ledger.handler.ts:47) references:
- `product_listing_fee` - **DOES NOT EXIST**
- `transaction_fee` - **DOES NOT EXIST**
- `gst` - **DOES NOT EXIST**

These should be queried by `feeName` and retrieved from the `value` field.

### Discrepancy #4: Missing Validation Logic

| Schema Feature | Handler Implementation | Status |
|---------------|------------------------|--------|
| `isActive` | Not checked | MISSING |
| `effectiveFrom` | Not validated | MISSING |
| `effectiveTo` | Not validated | MISSING |
| `calculationType` | Always assumes PERCENTAGE | MISSING |

---

## Corrections to Implementation Plan

### Original Plan vs. Corrected Approach

| Original Plan Item | Corrected Approach |
|-------------------|-------------------|
| Query by `feeCode` | Query by `feeName` |
| Create `PlatformFeeCode` constants | Use `feeName` values directly |
| Support only PERCENTAGE | Support both PERCENTAGE and FIXED |
| Skip validity checks | Include validity period validation |
| Skip active status check | Include `isActive` filter |

---

## Critical Issues

### Issue #1: CRITICAL BUG - Non-Existent Field References

**Location:** [`on-order-delivered-ledger.handler.ts:47-51`](src/ledger/services/handlers/on-order-delivered-ledger.handler.ts:47)

**Problem:** The handler attempts to access fields that do not exist in the PlatformFee table.

The handler code:
```typescript
const platformFees = fees ?? {
  product_listing_fee: new Decimal(0),
  transaction_fee: new Decimal(0),
  gst: new Decimal(0),
};
```

**Actual Schema Fields:**
- `feeName` (TEXT) - e.g., "LISTING_FEE", "TRANSACTION_FEE", "GST"
- `calculationType` (FeeCalculationType enum) - PERCENTAGE or FIXED
- `value` (DECIMAL) - The actual fee value
- `applyOnFeeCode` (TEXT, nullable) - For chained calculations

**Impact:** The fallback to default zeros will ALWAYS trigger since the query returns data with different field names. This means **NO platform fees are being calculated or stored**.

**Additional Issue - PlatformFeeType Import:**
The handler imports `PlatformFeeType` from `@prisma.client` at line 3:
```typescript
import { PaymentMode, PlatformFeeType } from '@prisma/client';
```
This enum is used for `feeType` field in ledger entries (e.g., `PlatformFeeType.LISTING_FEE`). However, this enum does not exist in the Prisma schema files and needs to be either defined in the schema or replaced with string literals matching the `feeName` values in PlatformFee.

**Recommended Fix:** Either add `PlatformFeeType` enum to the schema or update the handler to use string literals that match `feeName` values from PlatformFee table.

---

### Issue #2: Missing Fee Name Queries

**Problem:** The handler queries by `categoryId` only, without filtering by specific `feeName`.

Required fee names should be:
- `LISTING_FEE`
- `TRANSACTION_FEE` or `PAYMENT_GATEWAY_FEE`
- `GST`

---

### Issue #3: No Validity Period Validation

**Problem:** Fees are not validated against their effective date range.

The model has:
- `effectiveFrom` - When the fee becomes active
- `effectiveTo` - When the fee expires (nullable = indefinite)

---

### Issue #4: No Active Status Check

**Problem:** The `isActive` flag is not checked.

---

### Issue #5: Inefficient Fee Lookup Pattern

**Problem:** Fees are queried inside the loop for each order item.

```typescript
for (const item of event.orderItems) {
  let fees = await tx.platformFee.findFirst({
    where: { categoryId: item.product.categoryId },
  });
}
```

This causes N database queries for N order items with different categories.

---

### Issue #6: No Support for FIXED Calculation Type

**Problem:** The handler always treats fees as percentages.

```typescript
const listingFee = itemAmount
  .mul(platformFees.product_listing_fee)  // Assumes percentage
  .div(100);
```

The `FIXED` calculation type in the schema is never used.

---

## Required Changes

### Change #1: Fix PlatformFee Query and Add PlatformFeeType Definition

**File:** [`src/ledger/services/handlers/on-order-delivered-ledger.handler.ts`](src/ledger/services/handlers/on-order-delivered-ledger.handler.ts)

**Issue:** The handler imports `PlatformFeeType` from `@prisma/client` but this enum doesn't exist in the Prisma schema.

**Option A - Add PlatformFeeType to Schema (Recommended):**
Add to `prisma/models/ledger.prisma`:
```prisma
enum PlatformFeeType {
  LISTING_FEE
  PAYMENT_GATEWAY_FEE
  GST
  SALE
}
```

**Option B - Use String Literals:**
Replace `PlatformFeeType.LISTING_FEE` with `'LISTING_FEE'` (matching feeName values).

**Then update the fee query:**

1. Pre-fetch all relevant fees for the order's categories before the loop
2. Query by feeName with proper validity and active checks
3. Map the generic `value` field to specific fee types

**New approach:**
```typescript
// Pre-fetch all fee names for all categories in the order
const categoryIds = [...new Set(event.orderItems.map(item => item.product.categoryId))];
const now = new Date();

const feeRecords = await tx.platformFee.findMany({
  where: {
    categoryId: { in: categoryIds },
    isActive: true,
    effectiveFrom: { lte: now },
    OR: [
      { effectiveTo: null },
      { effectiveTo: { gte: now } }
    ]
  }
});

// Create a map for quick lookup by feeName
const feeMap = new Map<string, PlatformFee>();
for (const fee of feeRecords) {
  feeMap.set(fee.feeName, fee);
}

// Get specific fees with fallback
const getFeeValue = (feeName: string, defaultValue: Decimal): Decimal => {
  const fee = feeMap.get(feeName);
  if (!fee) return defaultValue;
  
  if (fee.calculationType === 'FIXED') {
    return fee.value; // Fixed amount
  }
  return fee.value; // For percentage, apply divisor in calculation
};
```

---

### Change #2: Update Fee Calculations to Support Both Types

**File:** [`src/ledger/services/handlers/on-order-delivered-ledger.handler.ts`](src/ledger/services/handlers/on-order-delivered-ledger.handler.ts)

**Updated code:**
```typescript
const listingFeeRecord = feeMap.get('LISTING_FEE');
let listingFee = new Decimal(0);

if (listingFeeRecord) {
  if (listingFeeRecord.calculationType === 'PERCENTAGE') {
    listingFee = itemAmount.mul(listingFeeRecord.value).div(100);
  } else {
    listingFee = listingFeeRecord.value; // FIXED amount per item
  }
}
```

Similarly update payment gateway fee and GST calculations.

---

### Change #3: Implement Chained Fee Calculations (Optional)

**Feature:** Support `applyOnFeeCode` for GST on transaction fee.

**Implementation approach:**
1. Calculate base fees first (listing fee, transaction fee)
2. Then calculate dependent fees (GST on transaction fee)

```typescript
// First pass: calculate base fees
const transactionFee = calculateFee(itemAmount, feeMap.get('TRANSACTION_FEE'));

// Second pass: calculate GST on transaction fee
const gstFeeRecord = feeMap.get('GST');
if (gstFeeRecord && gstFeeRecord.applyOnFeeCode === 'TRANSACTION_FEE') {
  const gstAmount = calculateFee(transactionFee, gstFeeRecord);
}
```

---

## Recommended Implementation Sequence

### Phase 1: Critical Bug Fix (Immediate)
1. [ ] Add PlatformFeeType enum to `prisma/models/ledger.prisma`
2. [ ] Run Prisma generate to update client
3. [ ] Update handler to query PlatformFee correctly using `feeName`
4. [ ] Add fee name filtering in queries
5. [ ] Add validity period checks
6. [ ] Add isActive checks
7. [ ] Test with existing data

### Phase 2: Feature Completeness (Short-term)
1. [ ] Support FIXED calculation type
2. [ ] Implement chained fee calculations (GST on transaction fee)
3. [ ] Add comprehensive logging
4. [ ] Update other ledger handlers (on-payment-succeeded-ledger.handler.ts) with same fixes

### Phase 3: Optimization (Medium-term)
1. [ ] Batch fee queries (pre-fetch before loop)
2. [ ] Add caching for frequently used fee configurations

---

## Testing Recommendations

### Unit Tests
- Test fee calculations with PERCENTAGE type
- Test fee calculations with FIXED type
- Test chained fee calculations
- Test default fallback when no fees configured
- Test validity period filtering

### Integration Tests
- Test end-to-end order delivery flow
- Verify ledger entries created correctly
- Verify fee amounts match expected calculations

---

## Impact Assessment

### Data Integrity
- **Current:** No platform fees being calculated (all fall back to zero)
- **After fix:** Correct fees will be calculated and stored

### Performance
- **Current:** N+1 query pattern (inefficient)
- **After fix:** Batched queries (more efficient)
- **Impact:** Improved performance for orders with multiple items

### Backward Compatibility
- Handler changes are internal - no API changes
- Ledger entries will have same structure
- Existing reports will continue to work

---

## Summary

The current implementation has a critical bug where platform fees are not being calculated due to schema changes that weren't reflected in the handler code. The fix requires:

1. **Add PlatformFeeType enum** - Either define in schema or use string literals
2. **Query PlatformFee correctly** - Use proper `feeName` queries with validity checks
3. **Support both calculation types** - PERCENTAGE and FIXED
4. **Validate fee applicability** - Check `isActive` and effective dates
5. **Optimize queries** - Pre-fetch fees before processing items

The new generic PlatformFee schema provides flexibility for complex fee structures but requires the handler to be updated to properly utilize its capabilities.

---

*Document Version: 2.0*
*Updated: 2026-02-15*
