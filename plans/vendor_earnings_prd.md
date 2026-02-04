
# Product Requirements Document (PRD)
## Vendor Earnings, Commission & Payout System

---

## 1. Overview

This document defines the requirements for introducing a **Vendor Earnings and Payout Management System**.  
Currently, the platform supports customer purchases, deliveries, subscriptions, and cancellations. However, there is no system for vendors to track their earnings, commissions, or payouts.

This PRD outlines the structure needed to calculate commissions, manage deductions, and provide vendors with transparent payout summaries.

---

## 2. Objectives

- Provide vendors visibility into their **sales, deductions, and payouts**
- Implement a **commission-based revenue model** for the platform
- Build a **scalable fee system** to support future deductions (payment gateway fees, marketing fees, etc.)
- Track **payout history and balances**
- Enable future **referral reward logic**

---

## 3. Scope

### In Scope
- Vendor earnings calculation
- Commission deduction logic
- Vendor summary dashboard API
- Admin payout tracking
- Referral reward tracking (logic only, not wallet system)

### Out of Scope (Current Phase)
- Actual payment gateway fee deduction implementation
- Automated vendor bank transfers
- Wallet or credit system for referral rewards

---

## 4. Commission & Fee Structure

### 4.1 Platform Commission (Phase 1)
| Category     | Commission Type | Value |
|--------------|----------------|-------|
| Water Jars   | Percentage     | 10%   |

- Applied only on **successfully delivered orders**
- Acts as the **platform fee** for now

### 4.2 Payment Gateway Fees (Future)
- Will be deducted from vendor payouts in later phases
- System must support storing and deducting this value later

### 4.3 Additional Platform/Marketing Fees (Future)
- Structure must allow adding new deduction types without schema redesign

---

## 5. Referral Reward Logic (Future-Ready)

**Trigger Condition:**
1. Customer A refers Customer B  
2. Customer B places an order  
3. First order is successfully delivered  

**Reward:**
- Customer A receives **2 free water jars**

**System Requirements:**
- Track referral relationships
- Track reward eligibility status
- Mark reward as issued (manual or automated in future)

---

## 6. Vendor Earnings Summary (API Requirement)

### 6.1 Purpose
Provide vendors a financial overview of their performance.

### 6.2 Included Calculations
- Total delivered order value
- Commission deducted (10% on water jars)
- Placeholder for future deductions
- Net payout amount

### 6.3 Suggested API Endpoint
`GET /vendor/earnings/summary`

### 6.4 Sample Response
```json
{
  "vendorId": "V123",
  "currency": "INR",
  "totalSales": 50000,
  "totalCommission": 5000,
  "paymentGatewayFees": 0,
  "otherFees": 0,
  "netPayout": 45000
}
```

---

## 7. Vendor Payout Tracking

### 7.1 Purpose
Allow vendors to track what has been paid and what remains pending.

### 7.2 Data to Track
- Total payable amount
- Total amount already paid
- Remaining balance
- Payout history records

### 7.3 Suggested API Endpoint
`GET /vendor/payouts`

### 7.4 Sample Response
```json
{
  "vendorId": "V123",
  "totalPayable": 45000,
  "totalPaid": 30000,
  "balanceRemaining": 15000,
  "payoutHistory": [
    {
      "payoutId": "P001",
      "amount": 15000,
      "date": "2026-02-01",
      "reference": "BANK-TRF-8891"
    }
  ]
}
```

---

## 8. Data & Calculation Rules

### Order Inclusion Rules
- Only **delivered orders** are considered for vendor earnings
- Cancelled or failed orders are excluded
- Refund-adjusted logic to be added in future phase

### Commission Formula
```
Commission = (Water Jar Order Value) × 10%
Net Payout = Total Sales − Commission − Future Fees
```

---

## 9. Admin Capabilities

Admins must be able to:
- View vendor earnings summary
- Approve payouts
- Record payout transactions
- Adjust deductions manually (future)

---

## 10. Future Enhancements

- Automatic payment gateway fee deduction
- Marketing fee campaigns
- Vendor performance analytics
- Automated payout processing
- Referral reward wallet/credit system

---

## 11. Deliverables

| Deliverable | Description |
|------------|-------------|
| Earnings Summary API | Vendor financial overview |
| Payout Tracking API | Vendor payout history |
| Commission Logic | 10% deduction on water jar category |
| Referral Logic | Reward eligibility tracking |

---

## 12. Success Metrics

- Vendors can clearly see earnings and deductions
- Reduced payout disputes
- Accurate commission tracking
- Scalable financial deduction system
