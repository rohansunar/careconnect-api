# Automated Order Generation for Subscription Deliveries

## 📋 Overview

This document comprehensively describes the implementation of automated order generation for subscription deliveries in the water delivery system, supporting both upfront online payment and post-delivery payment modes.

> **Key Features:**
> - Automated order creation based on subscription frequencies
> - Support for upfront and post-delivery payment modes
> - Handling of adjustments, confirmations, and edge cases

This feature ensures that orders are automatically created and processed, handling payments appropriately for each mode, and managing adjustments, confirmations, and edge cases.


## 💰 Payment Modes

| Icon | Payment Mode | Description | Order Generation | Delivery Confirmation | Adjustments/Collection |
|------|--------------|-------------|------------------|------------------------|-----------------------|
| 💰 | Upfront Online Payment | Full payment collected at subscription start (monthly). | Orders generated without immediate payment; payment secured. | Order marked completed; subscription continues. | Month-end adjustments for refunds/charges based on actual vs. expected deliveries. |
| 📅 | Post-Delivery Payment | Payment collected at month-end (monthly billing). | Orders generated for delivery tracking. | Order marked completed. | Deliveries accumulated; billed monthly at month-end. |


## Happy Paths

### Upfront Payment - All Deliveries Succeed
1. Subscription is active with upfront payment.
2. Orders generated daily/alternative Days/ Custom Day of Week based on frequency.
3. Deliveries completed successfully.
4. At month-end, expected deliveries match actual; no adjustments needed.
5. Subscription renews automatically with next month's payment.

### Post-Delivery Payment - All Deliveries Succeed
1. Subscription is active with post-delivery payment.
2. Orders generated for delivery.
3. Deliveries completed successfully.
4. Monthly bill generated with total amounts due.
5. Subscription continues without adjustments.

## ⚠️ Edge Cases

> **Warning:** These scenarios require careful handling to ensure accurate billing, customer satisfaction, and system integrity.

### 🚫 Missed Deliveries by Vendor

| Payment Mode | Impact | Handling |
|--------------|--------|----------|
| Upfront | Generate adjustment for refund at month-end. | Notify customer, retry delivery, or mark as missed. |
| Post-Delivery | No delivery, no charge; update monthly bill accordingly. | Notify customer, retry delivery, or mark as missed. |

### 👤 Customer Unavailability

| Payment Mode | Impact | Handling |
|--------------|--------|----------|
| Both Modes | Rider marks as unavailable; reschedule delivery. | No charge for missed delivery; adjust billing accordingly. |

### ❌ Product Rejection

| Payment Mode | Impact | Handling |
|--------------|--------|----------|
| Upfront | Customer rejects product; process refund for that delivery. | Update inventory, notify vendor, adjust subscription metrics. |
| Post-Delivery | No payment collected; update order status. | Update inventory, notify vendor, adjust subscription metrics. |

### 🛑 Subscription Cancellations with Refunds

| Payment Mode | Impact | Handling |
|--------------|--------|----------|
| Upfront | Calculate prorated refund based on remaining deliveries. | Update subscription status to INACTIVE, initiate refund if applicable. |
| Post-Delivery | Cancel future orders; process any outstanding payments. | Update subscription status to INACTIVE, initiate refund if applicable. |

### 🔄 Active Renewals with Adjustments

| Payment Mode | Impact | Handling |
|--------------|--------|----------|
| Upfront | At renewal, apply month-end adjustments before charging next month. | Ensure smooth transition with accurate billing. |
| Post-Delivery | Generate monthly bill; collect outstanding amounts. | Ensure smooth transition with accurate billing. |


## Adjustments for Upfront Payments
- **Month-End Process**: Compare expected vs. actual deliveries.
- **Refund Calculation**: (Expected - Actual) * Product Price.
- **Additional Charge**: (Actual - Expected) * Product Price.
- **Processing**: Use payment gateway for refunds/charges; update MonthlyBill model.

## Collection Processes for Post-Delivery Payments
- **Monthly Billing**: Accumulate deliveries; generate MonthlyBill at month-end with total amounts due.
- **Integration**: Update MonthlyBill model with delivery counts and amounts.

## Subscription Schema Issues

### Product Price Changes
**Problem**: If a vendor updates the product price, it directly affects subscription adjustments and calculations, potentially leading to inconsistent billing.

**Solutions**:

1. **Price Snapshot Approach**: Store the product price at the time of subscription creation. This ensures calculations use the original price.

   - Database Schema Update:

     ```prisma
     model Subscription {
       // ... existing fields
       price_snapshot Decimal @db.Decimal(10, 2)
       // ... rest
     }
     ```

   - Code Example (in subscription creation):

     ```typescript
     // In SubscriptionService
     async createSubscription(data: CreateSubscriptionDto) {
       const product = await this.prisma.product.findUnique({ where: { id: data.productId } });
       const subscription = await this.prisma.subscription.create({
         data: {
           // ... other data
           price_snapshot: product.price,
           // ...
         },
       });
       return subscription;
     }
     ```

2. **Price Adjustment Logic**: Implement logic to handle price changes gracefully, such as notifying users of price increases or applying changes at renewal.

### Product Deletion
**Problem**: If a vendor deletes a product, existing subscriptions become invalid, leading to failed order generation.

**Solutions**:

1. **Mark Subscriptions as Inactive**: When a product is deleted, automatically mark related subscriptions as inactive.

   - Code Example (in product deletion):

     ```typescript
     // In ProductService
     async deleteProduct(productId: string) {
       // Mark subscriptions inactive
       await this.prisma.subscription.updateMany({
         where: { productId },
         data: { status: 'INACTIVE' },
       });
       // Delete product
       await this.prisma.product.delete({ where: { id: productId } });
     }
     ```

2. **Notify Users and Provide Migration Options**: Send notifications to affected customers and offer options to migrate to similar products or cancel with refund.

   - Integration with notification service: `src/notification/services/notification.service.ts`

Reference: `plans/subscription/database_schema.md`, `prisma/models/subscription.prisma`

## ⚙️ Implementation Guide

### Step 1: Database Schema Updates
Update `prisma/models/subscription.prisma` to include payment mode enum:

<details><summary>Prisma Schema Update</summary>

```prisma
enum SubscriptionPaymentMode {
  UPFRONT
  POST_DELIVERY
}

model Subscription {
  // ... existing fields
  payment_mode SubscriptionPaymentMode @default(UPFRONT)
  // ... rest
}
```

</details>

Add delivery tracking to Order model if needed:

```prisma
model Order {
  // ... existing fields
  delivery_status String @default("PENDING") // PENDING, DELIVERED, FAILED, etc.
  // ... rest
}
```

Run migration:
```bash
npx prisma migrate dev --name add_subscription_payment_mode
```

### Step 2: Enhanced Order Generation Service
Create `src/order/services/order-generation.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentModeService } from '../../subscription/services/payment-mode.service';

@Injectable()
export class OrderGenerationService {
  private readonly logger = new Logger(OrderGenerationService.name);

  constructor(
    private prisma: PrismaService,
    private paymentModeService: PaymentModeService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyOrders() {
    this.logger.log('Starting daily order generation');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        next_delivery_date: { lte: today },
      },
      include: {
        customer: true,
        customerAddress: true,
        product: true,
      },
    });

    for (const subscription of subscriptions) {
      try {
        await this.createOrderFromSubscription(subscription);
        await this.updateSubscriptionNextDelivery(subscription);
      } catch (error) {
        this.logger.error(`Failed to generate order for subscription ${subscription.id}: ${error.message}`);
      }
    }

    this.logger.log(`Generated orders for ${subscriptions.length} subscriptions`);
  }

  private async createOrderFromSubscription(subscription: any) {
    const paymentMode = subscription.payment_mode === 'UPFRONT' ? 'ONLINE' : 'MONTHLY_BILLING';

    const order = await this.prisma.order.create({
      data: {
        customerId: subscription.customerId,
        addressId: subscription.customerAddressId,
        total_amount: subscription.total_price,
        status: 'PENDING',
        payment_mode: paymentMode,
        subscriptionId: subscription.id,
        orderItems: {
          create: {
            productId: subscription.productId,
            quantity: subscription.quantity,
            price: subscription.product.price,
          },
        },
      },
    });

    // For upfront, create payment record if needed
    if (subscription.payment_mode === 'UPFRONT') {
      // Assuming monthly payment already handled
    }

    return order;
  }

  private async updateSubscriptionNextDelivery(subscription: any) {
    const nextDelivery = new Date(subscription.next_delivery_date);

    // Use delivery frequency service
    // Assuming daily for simplicity
    nextDelivery.setDate(nextDelivery.getDate() + 1);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { next_delivery_date: nextDelivery },
    });
  }
}
```

Reference: `src/subscription/services/delivery-frequency.service.ts` for frequency calculations.

### Step 3: Month-End Adjustment Service
Create `src/subscription/services/month-end-adjustment.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class MonthEndAdjustmentService {
  private readonly logger = new Logger(MonthEndAdjustmentService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 0 1 * *') // 1st of every month
  async processMonthEndAdjustments() {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const subscriptions = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', payment_mode: 'UPFRONT' },
    });

    for (const sub of subscriptions) {
      await this.calculateAndApplyAdjustment(sub, lastMonth);
    }
  }

  private async calculateAndApplyAdjustment(subscription: any, month: Date) {
    // Calculate expected deliveries
    const expected = this.calculateExpectedDeliveries(subscription, month);

    // Get actual delivered orders
    const actual = await this.prisma.order.count({
      where: {
        subscriptionId: subscription.id,
        status: 'DELIVERED',
        created_at: {
          gte: new Date(month.getFullYear(), month.getMonth(), 1),
          lt: new Date(month.getFullYear(), month.getMonth() + 1, 1),
        },
      },
    });

    const adjustment = (expected - actual) * subscription.product.price;

    if (adjustment !== 0) {
      // Process refund or charge via payment gateway
      // Update MonthlyBill
      await this.prisma.monthlyBill.create({
        data: {
          customer_id: subscription.customerId,
          month: month.toISOString().slice(0, 7),
          total_amount: adjustment,
          status: adjustment > 0 ? 'REFUND_DUE' : 'CHARGE_DUE',
        },
      });
    }
  }

  private calculateExpectedDeliveries(subscription: any, month: Date): number {
    // Implement based on frequency
    // Reference: src/subscription/services/delivery-frequency.service.ts
    return 30; // Simplified
  }
}
```

Reference: `plans/subscription/end_of_month_workflow.md` for detailed workflow.

### Step 4: Post-Delivery Collection Handler
Update `src/order/services/order.service.ts` to handle delivery confirmation for monthly billing:

```typescript
// In OrderService
async confirmDelivery(orderId: string) {
  const order = await this.prisma.order.findUnique({ where: { id: orderId } });

  await this.prisma.order.update({
    where: { id: orderId },
    data: { status: 'DELIVERED' },
  });

  // For post-delivery subscriptions, accumulate delivery for monthly billing
  if (order.subscriptionId && order.payment_mode === 'MONTHLY_BILLING') {
    // Logic to update MonthlyBill with delivery count and amount
    // Reference: src/subscription/services/monthly-billing.service.ts
  }
}
```

### Step 5: Module Integration
Update `src/order/order.module.ts`:

```typescript
import { OrderGenerationService } from './services/order-generation.service';
import { MonthEndAdjustmentService } from '../subscription/services/month-end-adjustment.service';

@Module({
  providers: [OrderService, OrderGenerationService, MonthEndAdjustmentService],
  // ...
})
export class OrderModule {}
```

### Step 6: Testing
Add tests in `src/order/` following existing structure.

Reference: `plans/subscription/testing_considerations.md`

## Handling Vendor Inactivity on Order Creation Day

When generating orders automatically, it is crucial to check the vendor's availability to avoid creating orders for inactive or unavailable vendors. This section outlines the logic for detecting and handling vendor inactivity.

### Detection Logic
- **Check Vendor Status**: Before creating an order, query the vendor's `is_active` and `is_available_today` fields from `prisma/models/vendor.prisma`.
- **Operating Days**: Verify if the current day matches the vendor's `operatingDays` array.
- **Time Window**: Ensure the current time is within the vendor's `openingTime` and `closingTime`.

### Handling Steps
1. **Skip Order Creation**: If the vendor is inactive (`is_active: false`), skip generating the order for that subscription.
2. **Unavailable Today**: If `is_available_today: false`, reschedule the order to the next available day based on the vendor's operating days.
3. **Outside Operating Hours**: If the current time is outside operating hours, delay order creation until the next operating day.
4. **Notify Admin**: Send a notification to the admin for any skipped or rescheduled orders, including reasons.
5. **Customer Notification**: Optionally notify the customer about potential delays due to vendor unavailability.
6. **Log Events**: Record all inactivity detections in logs for auditing.

### Implementation Example
Update the `OrderGenerationService` to include vendor checks:

```typescript
// In src/order/services/order-generation.service.ts
private async createOrderFromSubscription(subscription: any) {
  // Check vendor availability
  const vendor = await this.prisma.vendor.findUnique({ where: { id: subscription.product.vendorId } });
  if (!vendor.is_active) {
    this.logger.warn(`Vendor ${vendor.id} is inactive, skipping order for subscription ${subscription.id}`);
    await this.notifyAdmin('Vendor Inactive', `Order skipped for subscription ${subscription.id} due to inactive vendor.`);
    return;
  }
  if (!vendor.is_available_today) {
    // Reschedule to next day
    await this.rescheduleSubscription(subscription);
    return;
  }
  // Proceed with order creation
  // ... existing code
}

private async rescheduleSubscription(subscription: any) {
  const nextDelivery = this.calculateNextDelivery(subscription, vendor);
  await this.prisma.subscription.update({
    where: { id: subscription.id },
    data: { next_delivery_date: nextDelivery },
  });
  await this.notifyAdmin('Order Rescheduled', `Subscription ${subscription.id} rescheduled due to vendor unavailability.`);
}
```

Reference: `prisma/models/vendor.prisma`, `src/notification/services/notification.service.ts`

## Calculate Expected Deliveries Function

The `calculateExpectedDeliveries` function computes the expected number of deliveries for a subscription based on its frequency, start date, end date, and any pauses or adjustments.

### Function Purpose
- **Inputs**: Subscription details (frequency, start_date, end_date, pauses), target month.
- **Output**: Number of expected deliveries in the given period.
- **Integration**: Used in month-end adjustments and billing calculations.

### Detailed Code Example
Add this method to `src/subscription/services/delivery-frequency.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class DeliveryFrequencyService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculates the expected number of deliveries for a subscription in a given month.
   * @param subscription - The subscription object including frequency, start_date, etc.
   * @param month - The target month (Date object).
   * @returns The expected number of deliveries.
   */
  calculateExpectedDeliveries(subscription: any, month: Date): number {
    const { frequency, start_date, end_date, pauses } = subscription;
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    // Adjust for subscription start and end dates
    const effectiveStart = start_date > monthStart ? start_date : monthStart;
    const effectiveEnd = end_date && end_date < monthEnd ? end_date : monthEnd;

    if (effectiveStart > effectiveEnd) return 0;

    // Calculate deliveries based on frequency
    let expected = 0;
    switch (frequency) {
      case 'DAILY':
        expected = this.calculateDailyDeliveries(effectiveStart, effectiveEnd);
        break;
      case 'ALTERNATE':
        expected = this.calculateAlternateDeliveries(effectiveStart, effectiveEnd);
        break;
      case 'CUSTOM':
        expected = this.calculateCustomDeliveries(subscription.custom_days, effectiveStart, effectiveEnd);
        break;
      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }

    // Adjust for pauses
    if (pauses && pauses.length > 0) {
      for (const pause of pauses) {
        const pauseStart = new Date(pause.start);
        const pauseEnd = new Date(pause.end);
        if (pauseStart <= effectiveEnd && pauseEnd >= effectiveStart) {
          const overlapStart = pauseStart > effectiveStart ? pauseStart : effectiveStart;
          const overlapEnd = pauseEnd < effectiveEnd ? pauseEnd : effectiveEnd;
          expected -= this.calculateDeliveriesInPeriod(frequency, overlapStart, overlapEnd);
        }
      }
    }

    return Math.max(0, expected);
  }

  private calculateDailyDeliveries(start: Date, end: Date): number {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  private calculateAlternateDeliveries(start: Date, end: Date): number {
    // Assuming alternate days starting from start date
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.ceil(days / 2);
  }

  private calculateCustomDeliveries(customDays: string[], start: Date, end: Date): number {
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (customDays.includes(d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase())) {
        count++;
      }
    }
    return count;
  }

  private calculateDeliveriesInPeriod(frequency: string, start: Date, end: Date): number {
    // Similar logic as above
    switch (frequency) {
      case 'DAILY':
        return this.calculateDailyDeliveries(start, end);
      case 'ALTERNATE':
        return this.calculateAlternateDeliveries(start, end);
      default:
        return 0; // Simplified
    }
  }
}
```

Reference: `prisma/models/subscription.prisma`, `src/subscription/services/delivery-frequency.service.ts`

## 🛠️ Admin Oversight and Implementation Details

Admins require comprehensive oversight of the automated order generation process, including monitoring, handling exceptions, and manual interventions. This section details the necessary implementations.

### 📊 Monitoring Dashboards
- **Order Generation Dashboard**: Display daily order generation stats, success rates, and failures.
- **Subscription Metrics**: Track active subscriptions, delivery frequencies, and payment modes.
- **Vendor Performance**: Monitor vendor availability, order fulfillment rates, and inactivity incidents.

### Handling Exceptions
- **Vendor Issues**: Manual override for inactive vendors, force order creation if necessary.
- **Customer Complaints**: Handle delivery failures, reschedule orders, or process refunds.
- **Subscription Pauses/Cancellations**: Update subscription status, calculate prorated adjustments, and notify customers.
- **Payment Failures**: Retry payments, switch payment modes, or escalate to support.

### Manual Interventions
- **Force Order Generation**: Allow admins to manually trigger order creation for specific subscriptions.
- **Adjustment Overrides**: Manually apply refunds or charges outside the automated process.
- **Renewal Management**: Handle subscription renewals, price changes, and billing cycles.

### Edge Cases Handling
- **Subscription Pauses**: Temporarily halt order generation, adjust expected deliveries.
- **Cancellations**: Process refunds based on remaining deliveries, update status to INACTIVE.
- **Renewals**: Apply adjustments before charging for the next period, handle price increases.

### API Endpoints and Code Snippets
Extend `src/subscription/controllers/admin-subscription.controller.ts`:

```typescript
// In AdminSubscriptionController
@Post('force-generate-order')
async forceGenerateOrder(@Body() data: { subscriptionId: string }) {
  return this.adminSubscriptionService.forceGenerateOrder(data.subscriptionId);
}

@Post('handle-exception')
async handleException(@Body() data: { subscriptionId: string, action: string, reason: string }) {
  return this.adminSubscriptionService.handleException(data.subscriptionId, data.action, data.reason);
}
```

In `src/subscription/services/admin-subscription.service.ts`:

```typescript
async forceGenerateOrder(subscriptionId: string) {
  const subscription = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
  // Logic to create order manually, bypassing checks
  await this.orderGenerationService.createOrderFromSubscription(subscription);
}

async handleException(subscriptionId: string, action: string, reason: string) {
  // Log exception, notify, and perform action (e.g., refund, reschedule)
  switch (action) {
    case 'REFUND':
      // Process refund
      break;
    case 'RESCHEDULE':
      // Update next_delivery_date
      break;
    default:
      throw new Error('Invalid action');
  }
}
```

Reference: `src/subscription/controllers/admin-subscription.controller.ts`, `src/subscription/services/admin-subscription.service.ts`, `prisma/models/subscription.prisma`

## References
- Prisma Models: `prisma/models/subscription.prisma`, `prisma/models/order.prisma`, `prisma/models/payment.prisma`, `prisma/models/monthlybill.prisma`
- Services: `src/subscription/services/payment-mode.service.ts`, `src/subscription/services/delivery-frequency.service.ts`
- Plans: `plans/subscription/payment_mode_logic.md`, `plans/subscription/end_of_month_workflow.md`


## Queue-Based Automated Order Generation

To handle high-volume order generation efficiently and ensure scalability, implement a queue-based system using a cron job to enqueue tasks and worker processes to process them asynchronously. This decouples order generation from the main application flow, allowing for better error handling, retries, and load distribution.

### Recommended Tools
- **Bull for NestJS**: A popular queue library for NestJS with Redis backend. Provides job scheduling, retries, and monitoring.
- **Alternative: RabbitMQ**: More robust for complex routing and clustering, but requires more setup.

Use Bull with Redis for simplicity and integration with NestJS.

### Schema Updates for Queue-Based Processing
No major schema changes are required, but ensure the subscription model uses an enum for payment_mode as suggested earlier. For tracking queue jobs, consider adding optional fields if needed for auditing:

```prisma
model Subscription {
  // ... existing fields
  last_job_id String? // Optional: Store Bull job ID for tracking
  // ... rest
}
```

Run migration if adding fields:
```bash
npx prisma migrate dev --name add_queue_tracking_fields
```

### Setup Steps

#### 1. Install Dependencies
```bash
npm install @nestjs/bull bull redis
npm install --save-dev @types/bull
```

#### 2. Configure Redis
Ensure Redis is running (locally or via Docker):
```bash
docker run -d -p 6379:6379 redis:alpine
```

Add to environment variables in `.env`:
```
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### 3. Create Queue Module
Create `src/queue/queue.module.ts`:
```typescript
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
      },
    }),
    BullModule.registerQueue({
      name: 'order-generation',
    }),
  ],
})
export class QueueModule {}
```

#### 4. Update Order Generation Service for Queue
Modify `src/order/services/order-generation.service.ts` to use queue:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class OrderGenerationService {
  private readonly logger = new Logger(OrderGenerationService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('order-generation') private orderQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async enqueueDailyOrders() {
    this.logger.log('Enqueuing daily order generation jobs');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        next_delivery_date: { lte: today },
      },
      select: { id: true },
    });

    for (const sub of subscriptions) {
      await this.orderQueue.add('generate-order', { subscriptionId: sub.id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 10,
      });
    }

    this.logger.log(`Enqueued ${subscriptions.length} order generation jobs`);
  }

  // Keep synchronous method for manual/admin calls
  async createOrderFromSubscription(subscriptionId: string) {
    // Existing logic, but make it async-safe
  }
}
```

#### 5. Create Queue Processor
Create `src/queue/processors/order-generation.processor.ts`:
```typescript
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { OrderGenerationService } from '../../order/services/order-generation.service';

@Injectable()
@Processor('order-generation')
export class OrderGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderGenerationProcessor.name);

  constructor(private orderGenerationService: OrderGenerationService) {
    super();
  }

  async process(job: Job<{ subscriptionId: string }>): Promise<void> {
    const { subscriptionId } = job.data;
    this.logger.log(`Processing order generation for subscription ${subscriptionId}`);

    try {
      // Fetch subscription with relations
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { customer: true, customerAddress: true, product: true, vendor: true },
      });

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      // Check vendor availability (existing logic)
      // Create order (existing logic)
      await this.orderGenerationService.createOrderFromSubscription(subscription);

      // Update next delivery date
      // ...

    } catch (error) {
      this.logger.error(`Failed to generate order for subscription ${subscriptionId}: ${error.message}`);
      throw error; // Let Bull handle retries
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed for subscription ${job.data.subscriptionId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(`Job ${job.id} failed for subscription ${job.data.subscriptionId}`);
  }
}
```

#### 6. Integration with Existing Logic
- Retain existing order creation logic in `createOrderFromSubscription`.
- Ensure idempotency: Check if order already exists for the date before creating.
- For month-end adjustments, keep synchronous or add to queue if high volume.

#### 7. Configuration
Add to `src/app/app.module.ts`:
```typescript
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [QueueModule, /* other modules */],
})
export class AppModule {}
```

Environment config for queue:
```
BULL_QUEUE_CONCURRENCY=5  // Number of concurrent workers
```

### Edge Cases Handling

#### Failed Payments
- For upfront subscriptions, if payment fails during renewal, enqueue retry job with exponential backoff.
- After max retries, mark subscription as INACTIVE and notify admin/customer.

#### Renewals
- Enqueue renewal jobs separately with higher priority.
- Check for price changes or adjustments before processing.

#### Duplicates
- Use unique job keys based on subscription ID and date.
- Check for existing orders before creating new ones.

#### Rate Limiting
- Implement rate limiting per vendor to prevent overload.
- Use Bull's rate limiter: `limiter: { max: 10, duration: 1000 }` per job.

#### High-Volume
- Scale workers horizontally using multiple instances.
- Use Redis cluster for high availability.
- Monitor queue depth and auto-scale.

### Admin Provisions

#### Notifications
- On job failure, notify admin via email/SMS with details.
- Dashboard to view queue status, failed jobs, and retry counts.

#### Error Handling with Retries
- Bull handles automatic retries with configurable backoff.
- Dead letter queue for jobs that fail after max attempts.

#### Overrides
- Admin API to manually retry failed jobs or force order creation.
- Endpoint: `POST /admin/queue/retry-job` with jobId.

#### Escalation
- If queue backlog exceeds threshold, escalate to on-call engineer.
- Integration with monitoring tools like DataDog or Prometheus.

### References
- Bull Documentation: https://docs.bullmq.io/
- NestJS Bull Integration: https://docs.nestjs.com/techniques/queues
- Schema Updates: `prisma/models/subscription.prisma`
- Existing Services: `src/order/services/order-generation.service.ts`

## Testing Strategies

### Overview
Testing the automated order generation system requires specialized approaches due to time-bound operations (daily and monthly cycles), high-volume processing, and complex business logic involving payments, adjustments, and edge cases. The current implementation relies on cron jobs and synchronous processing, which poses challenges for efficient testing without real-time delays. This section provides a comprehensive testing strategy that integrates with scalability recommendations, enabling reliable validation of the system under various conditions.

### Assessment of Current Testing Capabilities
The existing plan includes basic test references but lacks specific strategies for time-based triggers and high-load scenarios. Key limitations:
- Cron jobs (`@Cron`) are difficult to test without mocking time or running integration tests over extended periods.
- No provisions for simulating 1M+ subscriptions without generating massive test data.
- Sequential processing in loops limits testing throughput and concurrency.
- Month-end adjustments require waiting for monthly cycles, hindering rapid iteration.

Additional tools and implementations are needed for efficient testing, including time mocking libraries, load testing frameworks, and data generation utilities.

### Step-by-Step Guide for Simulating and Testing

#### Step 1: Set Up Testing Infrastructure
- **Framework Selection**: Use Jest (already in the project via package.json) for unit and integration tests. Supplement with Supertest for API testing and Artillery/k6 for load testing.
- **Time Mocking**: Install `sinon` or `jest-date-mock` for mocking `Date` objects and cron triggers.
  ```bash
  npm install --save-dev sinon jest-date-mock
  ```
- **Database Isolation**: Use test databases or transactions to isolate test data. Configure Prisma with test-specific schemas.
- **Mock Services**: Mock external dependencies like payment gateways and notification services using Jest mocks.

#### Step 2: Mock Time-Based Triggers
- **Unit Testing Cron Jobs**: Mock the cron scheduler to trigger methods manually.
  ```typescript
  // In test file
  import { jest } from '@jest/globals';
  import { OrderGenerationService } from '../order-generation.service';

  describe('OrderGenerationService', () => {
    let service: OrderGenerationService;

    beforeEach(() => {
      // Mock Prisma and dependencies
      service = new OrderGenerationService(mockPrisma, mockPaymentModeService);
    });

    it('should generate orders for active subscriptions', async () => {
      // Mock current date
      const mockDate = new Date('2023-01-01T00:00:00Z');
      jest.setSystemTime(mockDate);

      // Mock subscriptions data
      const mockSubscriptions = [
        { id: '1', status: 'ACTIVE', next_delivery_date: new Date('2022-12-31') },
        // ... more mocks
      ];
      mockPrisma.subscription.findMany.mockResolvedValue(mockSubscriptions);

      // Trigger the method directly (bypass cron)
      await service.generateDailyOrders();

      // Assertions
      expect(mockPrisma.order.create).toHaveBeenCalledTimes(mockSubscriptions.length);
    });
  });
  ```
- **Integration Testing**: Use `jest-date-mock` to simulate daily/monthly cycles without waiting.
  ```typescript
  import { advanceTo } from 'jest-date-mock';

  it('should handle month-end adjustments', async () => {
    // Advance to 1st of next month
    advanceTo(new Date('2023-02-01T00:00:00Z'));

    await monthEndService.processMonthEndAdjustments();

    // Verify adjustments processed
  });
  ```

#### Step 3: Generate Test Data
- **Data Factory Pattern**: Create factories for generating realistic test data at scale.
  ```typescript
  // src/test/factories/subscription.factory.ts
  import { faker } from '@faker-js/faker';

  export class SubscriptionFactory {
    static create(count: number = 1): any[] {
      return Array.from({ length: count }, () => ({
        id: faker.string.uuid(),
        status: 'ACTIVE',
        payment_mode: faker.helpers.arrayElement(['UPFRONT', 'POST_DELIVERY']),
        next_delivery_date: faker.date.future(),
        customerId: faker.string.uuid(),
        productId: faker.string.uuid(),
        quantity: faker.number.int({ min: 1, max: 5 }),
        total_price: faker.number.float({ min: 10, max: 100 }),
        // Include related entities
        customer: { id: faker.string.uuid(), name: faker.person.fullName() },
        customerAddress: { id: faker.string.uuid(), address: faker.location.streetAddress() },
        product: { id: faker.string.uuid(), price: faker.number.float({ min: 5, max: 20 }) },
      }));
    }
  }
  ```
- **Bulk Data Generation**: For high-load tests, generate 1M+ subscriptions using scripts.
  ```typescript
  // scripts/generate-test-data.ts
  import { SubscriptionFactory } from '../src/test/factories/subscription.factory';
  import { PrismaClient } from '@prisma/client';

  const prisma = new PrismaClient();

  async function generateTestData() {
    const subscriptions = SubscriptionFactory.create(1000000); // 1M records
    await prisma.subscription.createMany({ data: subscriptions });
  }

  generateTestData();
  ```
- **Data Seeding**: Use existing `scripts/seedData.ts` as a base, extending it for scalable test data.

#### Step 4: Simulate High User Loads
- **Load Testing Tools**: Use Artillery for HTTP-based load testing and k6 for scenario-based tests.
  ```javascript
  // artillery.yml
  config:
    target: 'http://localhost:3000'
    phases:
      - duration: 60
        arrivalRate: 1000  # Ramp up to 1000 requests/second
  scenarios:
    - name: 'Simulate daily order generation'
      flow:
        - post:
            url: '/admin/subscriptions/force-generate-order'
            json:
              subscriptionId: '{{ $randomInt(1, 1000000) }}'
  ```
- **Database Load Simulation**: Run parallel queries to simulate concurrent subscription processing.
  ```typescript
  // Load test script
  import { OrderGenerationService } from '../src/order/services/order-generation.service';

  async function simulateLoad() {
    const service = new OrderGenerationService(prisma, paymentModeService);
    const promises = [];

    for (let i = 0; i < 1000; i++) {  // Simulate 1000 concurrent processes
      promises.push(service.generateDailyOrders());
    }

    await Promise.allSettled(promises);
  }
  ```
- **Integration with Scalability**: Test with queue systems by enqueuing 1M+ jobs and monitoring processing rates.

#### Step 5: Validate Outputs and Edge Cases
- **Output Validation**: Assert correct order creation, payment processing, and adjustment calculations.
  ```typescript
  it('should create correct order for upfront subscription', async () => {
    const subscription = SubscriptionFactory.create()[0];
    subscription.payment_mode = 'UPFRONT';

    await service.createOrderFromSubscription(subscription);

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payment_mode: 'ONLINE',
          total_amount: subscription.total_price,
        }),
      })
    );
  });
  ```
- **Edge Case Testing**: Test vendor inactivity, missed deliveries, and cancellations.
  ```typescript
  it('should skip order for inactive vendor', async () => {
    const subscription = SubscriptionFactory.create()[0];
    mockPrisma.vendor.findUnique.mockResolvedValue({ is_active: false });

    await service.createOrderFromSubscription(subscription);

    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(mockNotificationService.notifyAdmin).toHaveBeenCalled();
  });
  ```
- **Month-End Validation**: Verify adjustment calculations and monthly bill generation.
  ```typescript
  it('should calculate correct adjustments', async () => {
    const subscription = SubscriptionFactory.create()[0];
    const month = new Date('2023-01-01');

    // Mock 25 actual deliveries out of 30 expected
    mockPrisma.order.count.mockResolvedValue(25);

    const adjustment = await service.calculateAndApplyAdjustment(subscription, month);

    expect(adjustment).toBe((30 - 25) * subscription.product.price);
  });
  ```

#### Step 6: Integrate with Scalability Recommendations
- **Batch Processing Tests**: Test batch sizes (e.g., 1000 subscriptions) and measure performance.
- **Queue Integration**: Use Redis/MQ for testing asynchronous processing.
- **Monitoring Integration**: Assert metrics collection during tests.
- **Load Balancing**: Test with multiple service instances using Docker Compose.
- **Database Optimization**: Validate query performance with EXPLAIN ANALYZE in tests.

### Best Practices for Automated Testing Frameworks
- **Test Pyramid**: Focus on unit tests (80%) for business logic, integration tests (15%) for service interactions, and end-to-end tests (5%) for critical flows.
- **Continuous Integration**: Run tests on every commit using GitHub Actions, including load tests in staging environments.
- **Test Data Management**: Use factories for consistent, realistic data. Clean up after tests to avoid interference.
- **Mocking Strategy**: Mock external services (payment gateways, notifications) to isolate unit tests. Use contract testing for API integrations.
- **Performance Benchmarks**: Establish baseline performance metrics and alert on regressions.
- **Flaky Test Prevention**: Use retries for async operations and avoid time-dependent assertions.
- **Code Coverage**: Aim for 80%+ coverage, focusing on critical paths like order generation and adjustments.
- **Documentation**: Maintain test documentation in `plans/testing.md`, updating with new patterns.
- **Parallel Execution**: Run tests in parallel to reduce CI time, using Jest's `--maxWorkers` flag.
- **Security Testing**: Include tests for authentication, authorization, and data privacy in automated flows.

By following this testing strategy, the system can be reliably validated for time-bound operations, high loads, and complex scenarios, ensuring scalability and correctness before deployment.