# Ledger Description Field Implementation Plan

## 1. Prisma Schema Change

Add optional `description` field to the Ledger model in `prisma/models/ledger.prisma`:

```prisma
model Ledger {
  id           String   @id @default(cuid())
  vendorId     String
  orderItemId  String

  type         LedgerType
  feeType      PlatformFeeType?
  amount       Decimal  @db.Decimal(12, 2)

  /// Optional description for transaction details
  description  String?

  paymentMode  PaymentMode

  createdAt    DateTime @default(now())
  // ... relations and indexes
}
```

## 2. Affected Files Analysis

### Files that CREATE Ledger entries (require update to accept optional description):

1. **`src/ledger/services/handlers/ledger.factory.ts`**
   - `createSaleEntry()` - Line 21-29
   - `createPlatformFeeEntry()` - Line 41-50
   - `createRefundReversal()` - Lines 60-67, 79-88
   
2. **`src/ledger/services/handlers/on-payment-succeeded-ledger.handler.ts`**
   - Calls `ledgerFactory.createSaleEntry()` - Line 49
   - Calls `ledgerFactory.createPlatformFeeEntry()` - Lines 59, 72, 82, 91, 103

3. **`src/order/services/vendor-order.service.ts`**
   - `createPlatformListingFeeEntriesTransaction()` - Line 441-449 (COD orders)
   - `cancelOrder()` refund entry - Line 599-608
   - `createRefundFeeReversalEntries()` - Line 710-718

### Files that READ/QUERY Ledger entries:

4. **`src/vendor/services/dashboard.service.ts`**
   - `getDashboardSummary()` - Lines 152, 165 (uses `ledger.aggregate()`)

## 3. Required Modifications

### Option A: Add description parameter to all factory methods (Recommended)

Update `LedgerFactory` class to accept optional `description` parameter:

```typescript
async createSaleEntry(params: {
  vendorId: string;
  orderItemId: string;
  amount: Decimal;
  paymentMode: PaymentMode;
  description?: string;  // NEW
}) {
  return this.tx.ledger.create({
    data: {
      vendorId: params.vendorId,
      orderItemId: params.orderItemId,
      type: LedgerType.SALE,
      amount: params.amount,
      paymentMode: params.paymentMode,
      description: params.description,  // NEW
    },
  });
}
```

Similar updates needed for:
- `createPlatformFeeEntry()`
- `createRefundReversal()`

### Option B: Add descriptions at caller sites

Add descriptive text when calling factory methods in:
- `on-payment-succeeded-ledger.handler.ts`
- `vendor-order.service.ts`

Example descriptions:
- `"Sale transaction for order item {orderItemId}"`
- `"Platform listing fee for order item {orderItemId}"`
- `"Payment gateway fee for online payment"`
- `"Refund for cancelled order {orderId}"`

## 4. Migration Commands

After updating the schema:

```bash
# Generate migration
npx prisma migrate dev --name add_ledger_description

# Apply migration
npx prisma migrate deploy
```

## 5. TypeScript Type Safety

The Prisma client will automatically generate the `description` field as optional (`string | null`). No manual type changes needed.

## 6. Testing Considerations

- No existing test files found for Ledger (ledger.spec.ts)
- Consider adding integration tests for ledger factory methods
- Test both with and without description field

## 7. Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `prisma/models/ledger.prisma` | Schema update | Required |
| `src/ledger/services/handlers/ledger.factory.ts` | Add description param to methods | High |
| `src/ledger/services/handlers/on-payment-succeeded-ledger.handler.ts` | Pass description to factory | High |
| `src/order/services/vendor-order.service.ts` | Pass description to ledger.create() | High |
| `src/vendor/services/dashboard.service.ts` | Read-only - no changes needed | N/A |
