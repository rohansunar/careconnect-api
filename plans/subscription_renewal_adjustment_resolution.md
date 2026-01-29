# Subscription Renewal Adjustment Resolution Plan

## Problem Statement
Customers are notified for subscription renewals, but monthly settlements (adjustments for completed, failed, or missed deliveries) occur at the end of the month. For renewals, if adjustments for the previous month's bills have not been completed, the system cannot charge the customer the full renewal amount without first settling the prior month's adjustments. This creates a timing conflict where renewals may occur before adjustments are finalized.

## Current State Analysis
- **Renewal Process**: Currently notification-only, no actual renewal logic implemented.
- **Adjustment Process**: Handled by `MonthEndAdjustmentService` running at month-end, creating `MonthlyBill` records with `PENDING` status.
- **Payment Mode**: Subscriptions default to `UPFRONT` payment mode.
- **Database Models**: `MonthlyBill` has status (`PENDING`, `PAID`, `OVERDUE`) and tracks paid amounts.

## Proposed Solution Architecture

### 1. Renewal Service Implementation
Create a new `SubscriptionRenewalService` that:
- Runs automatically on a monthly cron (e.g., 1st of each month)
- Checks for subscriptions eligible for renewal
- Validates delivery completion and applies adjustments before processing payment

### 2. Pre-Renewal Adjustment Validation
**Logic Flow:**
```
For each active subscription:
  1. Check if previous month's adjustments are settled (MonthlyBill.status != PENDING)
  2. If not settled:
     - Run adjustment calculation for previous month
     - Apply adjustments (refunds/charges) to customer's account
     - Update MonthlyBill status to PAID or appropriate status
  3. Calculate renewal amount (full price ± adjustments)
  4. Process renewal payment
  5. Update subscription next_billing_date
```

### 3. Adjustment Application Logic
- **For Under-delivery**: Customer overpaid → Issue refund or credit to next renewal
- **For Over-delivery**: Customer underpaid → Add charge to renewal amount
- **Settlement Priority**: Process refunds first, then charges

### 4. Customer Notification Strategy
**Proactive Notifications (7 days before renewal):**
- Check for potential adjustments based on current delivery status
- Notify customers if renewal amount may be adjusted
- Provide estimated adjustment amount

**Post-Adjustment Notifications:**
- Notify when adjustments are applied
- Confirm renewal amount and any credits/refunds

**Blocked Renewal Notifications:**
- If adjustments cannot be processed automatically, notify customer
- Provide manual resolution options

### 5. Database Schema Updates
Add to `MonthlyBill` model:
```prisma
applied_at DateTime?
adjustment_type AdjustmentType // REFUND, CHARGE, CREDIT
```

Add `AdjustmentType` enum:
```prisma
enum AdjustmentType {
  REFUND
  CHARGE
  CREDIT
}
```

### 6. API Endpoints
Implement renewal endpoints as per planning document:
- `POST /subscriptions/{id}/renew` - Manual renewal with adjustment validation
- `GET /subscriptions/{id}/renewal-status` - Check renewal eligibility and pending adjustments

### 7. Error Handling & Retry Logic
- **Payment Failures**: 3 retry attempts over 5 days
- **Adjustment Calculation Errors**: Log and notify admin, block renewal
- **Settlement Failures**: Suspend subscription until resolved

### 8. Integration Points
- **Payment Service**: Process refunds, charges, and renewal payments
- **Notification Service**: Send renewal and adjustment notifications
- **Billing Service**: Update MonthlyBill statuses and amounts

## Implementation Phases

### Phase 1: Core Renewal Logic
- Implement `SubscriptionRenewalService`
- Add adjustment validation methods
- Create renewal cron job

### Phase 2: Adjustment Processing
- Enhance `MonthEndAdjustmentService` for on-demand calculations
- Implement settlement logic (refunds/charges)
- Update MonthlyBill status tracking

### Phase 3: Customer Communications
- Implement proactive notification system
- Add renewal status API endpoints
- Create notification templates for adjustments

### Phase 4: Testing & Monitoring
- Unit tests for adjustment calculations
- Integration tests for renewal flow
- Monitoring for failed renewals and adjustments

## Risk Mitigation
- **Data Consistency**: Ensure adjustment calculations are idempotent
- **Payment Security**: Validate all payment operations
- **Customer Experience**: Clear communication about adjustments
- **Fallback**: Manual admin override for complex cases

## Success Metrics
- 100% renewal processing without blocking due to unsettled adjustments
- <5% failed renewal payments
- Customer satisfaction with adjustment transparency
- Reduced manual intervention for renewals

## Next Steps
1. Review and approve this plan
2. Begin implementation with Phase 1
3. Schedule testing with various delivery scenarios
4. Monitor and iterate based on real-world usage