
# 📜 Subscription Pricing Logic – Functional Specification

## 📋 Overview
This document defines the pricing calculation logic for product subscriptions based on frequency, start date, and remaining days in the month. It also includes a step-by-step NestJS implementation guide.

---

## 1. 📅 Supported Subscription Frequencies

### A. 🔄 Daily
Customer receives the product every day.

**Formula**
Total = Product Price × Number of delivery days remaining in the month

---

### B. 🔄 Alternate Days
Customer receives the product every other day (1 day delivery, 1 day gap).

**Formula**
Total = Product Price × Number of alternate delivery days remaining in the month

Delivery starts from the subscription start date.

---

### C. 📅 Custom Days of the Week
Customer selects specific weekdays (e.g., Monday, Wednesday, Friday).

**Formula**
Total = Product Price × Number of selected weekdays remaining in the month

---

## 2. 📅 Subscription Start Date Impact

Calculations are always performed from the subscription start date until the end of that month only.

| Start Date | Month Length | Frequency | Calculation Window |
|------------|--------------|-----------|--------------------|
| 15th Jan   | 31 days      | Daily     | Jan 15 → Jan 31     |
| 24th Feb   | 28 days      | Alternate | Feb 24 → Feb 28     |
| 10th Mar   | 31 days      | Custom    | Mar 10 → Mar 31     |

---

## 3. ⚠️ End-of-Month Edge Case Rule

If the remaining valid delivery days in the current month are too few, billing shifts to the next full month.

| Frequency | Minimum Required |
|----------|------------------|
| Daily | At least 1 day |
| Alternate Days | At least 2 calendar days |
| Custom Days | At least 1 selected weekday |

---

## 4. 🧮 Detailed Calculation Logic

### Daily
remainingDays = lastDateOfMonth - startDate + 1  
If remainingDays >= 1 → charge for remainingDays  
Else → move to next month

---

### Alternate Days
remainingDays = lastDateOfMonth - startDate + 1  
If remainingDays < 2 → move to next month  
deliveries = ceil(remainingDays / 2)

---

### Custom Weekdays
Loop from startDate → lastDateOfMonth  
Count matching weekdays  
If count == 0 → move to next month

---

## 5. 🔄 Next Month Fallback Logic

| Frequency | Next Month Calculation |
|----------|------------------------|
| Daily | Price × total days in next month |
| Alternate | Price × ceil(days_in_month / 2) |
| Custom | Price × number of selected weekdays in next month |

---

# 🛠️ NestJS Implementation Guide

## Step 1: DTO

```ts
// File: src/subscription/dto/create-subscription.dto.ts
export class CreateSubscriptionDto {
  productPrice: number;
  frequency: 'DAILY' | 'ALTERNATE' | 'CUSTOM';
  startDate: string; // ISO date
  customWeekDays?: number[]; // 0=Sun, 1=Mon ... 6=Sat
}
```

---

## Step 2: Install Date Library

```bash
npm install date-fns
```

---

## Step 3: Pricing Service

```ts
// File: src/subscription/services/price-calculation.service.ts
import { Injectable } from '@nestjs/common';
import {
  differenceInCalendarDays,
  lastDayOfMonth,
  addDays,
  startOfMonth,
  endOfMonth
} from 'date-fns';

@Injectable()
export class SubscriptionPricingService {
  calculateAmount(dto: CreateSubscriptionDto) {
    const startDate = new Date(dto.startDate);
    const endOfMonthDate = lastDayOfMonth(startDate);

    switch (dto.frequency) {
      case 'DAILY':
        return this.calculateDaily(dto.productPrice, startDate, endOfMonthDate);
      case 'ALTERNATE':
        return this.calculateAlternate(dto.productPrice, startDate, endOfMonthDate);
      case 'CUSTOM':
        return this.calculateCustom(
          dto.productPrice,
          startDate,
          endOfMonthDate,
          dto.customWeekDays || []
        );
    }
  }

  private calculateDaily(price: number, start: Date, end: Date) {
    const remainingDays = differenceInCalendarDays(end, start) + 1;
    if (remainingDays < 1) return this.calculateNextMonthDaily(price, start);
    return price * remainingDays;
  }

  private calculateAlternate(price: number, start: Date, end: Date) {
    const remainingDays = differenceInCalendarDays(end, start) + 1;
    if (remainingDays < 2) return this.calculateNextMonthAlternate(price, start);
    const deliveries = Math.ceil(remainingDays / 2);
    return price * deliveries;
  }

  private calculateCustom(price: number, start: Date, end: Date, weekDays: number[]) {
    let count = 0;
    let current = start;

    while (current <= end) {
      if (weekDays.includes(current.getDay())) count++;
      current = addDays(current, 1);
    }

    if (count === 0) return this.calculateNextMonthCustom(price, start, weekDays);
    return price * count;
  }

  private calculateNextMonthDaily(price: number, start: Date) {
    const nextMonthStart = startOfMonth(addDays(start, 32));
    const nextMonthEnd = endOfMonth(nextMonthStart);
    const days = differenceInCalendarDays(nextMonthEnd, nextMonthStart) + 1;
    return price * days;
  }

  private calculateNextMonthAlternate(price: number, start: Date) {
    const nextMonthStart = startOfMonth(addDays(start, 32));
    const nextMonthEnd = endOfMonth(nextMonthStart);
    const days = differenceInCalendarDays(nextMonthEnd, nextMonthStart) + 1;
    return price * Math.ceil(days / 2);
  }

  private calculateNextMonthCustom(price: number, start: Date, weekDays: number[]) {
    const nextMonthStart = startOfMonth(addDays(start, 32));
    const nextMonthEnd = endOfMonth(nextMonthStart);

    let count = 0;
    let current = nextMonthStart;

    while (current <= nextMonthEnd) {
      if (weekDays.includes(current.getDay())) count++;
      current = addDays(current, 1);
    }

    return price * count;
  }
}
```

---

## 🎯 Outcome
This logic ensures accurate subscription billing based on frequency, partial months, and edge cases where delivery days are insufficient.

---

## 🧪 Test Cases

### Unit Tests

| Test Name | Description | Expected Outcome |
|-----------|-------------|------------------|
| `testDailyFrequency` | Validate daily frequency calculation for mid-month start | Correct prorated price for remaining days |
| `testAlternateDaysFrequency` | Validate alternate days frequency calculation | Correct prorated price for alternate days |
| `testCustomDaysFrequency` | Validate custom days frequency calculation | Correct prorated price for selected weekdays |
| `testEdgeCaseDaily` | Test edge case where remaining days are insufficient for daily frequency | Billing shifts to next month |
| `testEdgeCaseAlternateDays` | Test edge case where remaining days are insufficient for alternate days frequency | Billing shifts to next month |
| `testEdgeCaseCustomDays` | Test edge case where remaining days are insufficient for custom days frequency | Billing shifts to next month |

### Integration Tests

| Test Name | Description | Expected Outcome |
|-----------|-------------|------------------|
| `testPaymentGatewayIntegration` | Validate integration with payment gateway for subscription creation | Successful payment processing and subscription activation |
| `testUserRoleSync` | Validate synchronization of user roles post-subscription | User role updated to reflect subscription status |
| `testCrossServiceInteraction` | Validate interaction between subscription service and user management service | Seamless data flow and consistency across services |

---

## 💡 Suggested Improvements

### 1. Dynamic Pricing Tier Visualization
**Description:** Implement an interactive comparison table for pricing tiers.
**Impact:** High
**Effort:** 1 sprint

### 2. Localization Support
**Description:** Add support for multiple currencies and localized formatting.
**Impact:** Medium
**Effort:** 1 sprint

### 3. Deprecation Warnings for Outdated Plans
**Description:** Introduce warnings for deprecated subscription plans.
**Impact:** Low
**Effort:** 0.5 sprint

### 4. Enhanced Logging for Pricing Calculations
**Description:** Add detailed logs for pricing calculations to aid debugging.
**Impact:** Medium
**Effort:** 0.5 sprint

### 5. Automated Tier Recommendations
**Description:** Provide automated recommendations for subscription tiers based on usage patterns.
**Impact:** High
**Effort:** 2 sprints

---

## 📌 Notes
- Ensure all changes align with the existing codebase and documented requirements.
- Prioritize readability and maintainability in all modifications.
- Preserve all existing content, features, and functionality.
