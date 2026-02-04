# Razorpay Webhook Implementation Plan

## Overview

Razorpay is a **payment gateway only**. All subscription management is handled internally by the application.

**Webhook responsibilities:**
1. Verify payment authenticity
2. Update subscription status based on payment outcome
3. Create payment records for admin review queue

## Schema Relationships

```
Payment ──► Order ──► Subscription
              │
              └──► Payment (review queue)
```

- `Payment.provider_payment_id` - Links to Razorpay payment
- `Order.subscriptionId` - Links order to subscription
- `Payment.metadata.subscriptionId` - Links payment to subscription
- `Payment.reconciled` - False = pending admin review, True = approved

## Webhook Events to Handle

| Event | Action |
|-------|--------|
| `payment.captured` | Payment SUCCESS → Update Subscription ACTIVE → Create review Payment |
| `payment.failed` | Payment FAILED → Update Subscription PROCESSING → Create FAILED Payment |
| `payment.refunded` | Payment REFUNDED → Update Subscription INACTIVE → Create REFUNDED Payment |

## Implementation Steps

### Step 1: Verify Webhook Signature

```typescript
// PaymentProviderService
async verifyWebhook(webhookData: any, signature?: string): Promise<WebhookVerificationData> {
  if (signature) {
    const webhookSecret = this.configService.get('RAZORPAY_WEBHOOK_SECRET');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(webhookData))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }
  }

  const paymentId = webhookData.payload?.payment?.entity?.id;
  const status = webhookData.payload?.payment?.entity?.status;

  return { providerPaymentId: paymentId, status: status.toUpperCase() };
}
```

### Step 2: Handle Webhook in PaymentService

```typescript
// PaymentService
async handleWebhook(webhookData: Record<string any>, signature?: string) {
  // Verify webhook
  const verifiedData = await this.paymentProvider.verifyWebhook(webhookData, signature);

  // Find existing Payment record
  const payment = await this.prisma.payment.findFirst({
    where: { provider_payment_id: verifiedData.providerPaymentId },
    include: { order: true },
  });

  if (!payment) {
    throw new NotFoundException('Payment not found');
  }

  // Route by payment status
  switch (verifiedData.status) {
    case 'CAPTURED':
      return this.handleSuccessfulPayment(payment, webhookData);
    case 'FAILED':
      return this.handleFailedPayment(payment, webhookData);
    case 'REFUNDED':
      return this.handleRefundedPayment(payment, webhookData);
    default:
      return this.handlePendingPayment(payment, webhookData);
  }
}
```

### Step 3: Handle Successful Payment

```typescript
private async handleSuccessfulPayment(payment: any, webhookData: any) {
  // 1. Update existing Payment record
  await this.prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PAID,
      completed_at: new Date(),
      provider_payload: webhookData,
    },
  });

  // 2. Update Order payment status if linked
  if (payment.order_id) {
    await this.prisma.order.update({
      where: { id: payment.order_id },
      data: { payment_status: 'PAID' },
    });
  }

  // 3. Update Subscription status
  if (payment.order?.subscriptionId) {
    await this.prisma.subscription.update({
      where: { id: payment.order.subscriptionId },
      data: { status: SubscriptionStatus.ACTIVE },
    });
  } else if (payment.metadata?.subscriptionId) {
    await this.prisma.subscription.update({
      where: { id: payment.metadata.subscriptionId },
      data: { status: SubscriptionStatus.ACTIVE },
    });
  }

  // 4. Create NEW Payment record for admin review queue
  await this.prisma.payment.create({
    data: {
      order_id: payment.order_id,
      amount: payment.amount,
      currency: 'INR',
      provider: 'RAZORPAY',
      provider_payment_id: `${payment.provider_payment_id}_review_${Date.now()}`,
      status: PaymentStatus.PAID,
      completed_at: new Date(),
      reconciled: false, // Pending admin approval
      provider_payload: webhookData,
      metadata: {
        originalPaymentId: payment.id,
        subscriptionId: payment.order?.subscriptionId || payment.metadata?.subscriptionId,
        reviewType: 'subscription_payment',
      },
    },
  });

  return { success: true, action: 'payment_success' };
}
```

### Step 4: Handle Failed Payment

```typescript
private async handleFailedPayment(payment: any, webhookData: any) {
  // 1. Update existing Payment record
  await this.prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.FAILED,
      provider_payload: webhookData,
    },
  });

  // 2. Update Order payment status
  if (payment.order_id) {
    await this.prisma.order.update({
      where: { id: payment.order_id },
      data: { payment_status: 'FAILED' },
    });
  }

  // 3. Update Subscription to PROCESSING (requires retry)
  if (payment.order?.subscriptionId) {
    await this.prisma.subscription.update({
      where: { id: payment.order.subscriptionId },
      data: { status: SubscriptionStatus.PROCESSING },
    });
  }

  // 4. Create FAILED Payment record for admin review
  await this.prisma.payment.create({
    data: {
      order_id: payment.order_id,
      amount: payment.amount,
      currency: 'INR',
      provider: 'RAZORPAY',
      provider_payment_id: `${payment.provider_payment_id}_failed_${Date.now()}`,
      status: PaymentStatus.FAILED,
      reconciled: false,
      provider_payload: webhookData,
      metadata: {
        originalPaymentId: payment.id,
        subscriptionId: payment.order?.subscriptionId,
        reviewType: 'payment_failed',
      },
    },
  });

  return { success: true, action: 'payment_failed' };
}
```

### Step 5: Handle Refunded Payment

```typescript
private async handleRefundedPayment(payment: any, webhookData: any) {
  // 1. Update existing Payment record
  await this.prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.REFUNDED,
      provider_payload: webhookData,
    },
  });

  // 2. Update Order payment status
  if (payment.order_id) {
    await this.prisma.order.update({
      where: { id: payment.order_id },
      data: { payment_status: 'REFUNDED' },
    });
  }

  // 3. Update Subscription to INACTIVE
  if (payment.order?.subscriptionId) {
    await this.prisma.subscription.update({
      where: { id: payment.order.subscriptionId },
      data: { status: SubscriptionStatus.INACTIVE },
    });
  }

  // 4. Create REFUNDED Payment record for admin review
  await this.prisma.payment.create({
    data: {
      order_id: payment.order_id,
      amount: payment.amount,
      currency: 'INR',
      provider: 'RAZORPAY',
      provider_payment_id: `${payment.provider_payment_id}_refunded_${Date.now()}`,
      status: PaymentStatus.REFUNDED,
      reconciled: false,
      provider_payload: webhookData,
      metadata: {
        originalPaymentId: payment.id,
        subscriptionId: payment.order?.subscriptionId,
        reviewType: 'payment_refunded',
      },
    },
  });

  return { success: true, action: 'payment_refunded' };
}
```

## Environment Variables

```
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_for_signature_verification
```

## Database Requirement

Add `razorpay_payment_id` field to track Razorpay payment ID directly on subscriptions:

```prisma
model Subscription {
  // ... existing fields
  razorpay_payment_id String? // For linking payments to subscriptions
}
```

## Flow Diagram

```mermaid
flowchart TD
    A[Razorpay Webhook] --> B[Verify Signature]
    B --> C[Find Payment by provider_payment_id]
    C --> D{Found?}\nNo
    D -->|No| E[Return 404]
    D -->|Yes| F{Status?}
    
    F -->|CAPTURED| G[Update Payment PAID]\nUpdate Order\nUpdate Subscription ACTIVE\nCreate Review Payment\n
    F -->|FAILED| H[Update Payment FAILED]\nUpdate Order\nUpdate Subscription PROCESSING\nCreate FAILED Payment\n
    F -->|REFUNDED| I[Update Payment REFUNDED]\nUpdate Order\nUpdate Subscription INACTIVE\nCreate REFUNDED Payment\n
    F -->|AUTHORIZED| J[Update Payment PENDING]\nNo further action\n
```

## Scenario Summary

| Scenario | Payment | Subscription | Review Queue |
|----------|---------|--------------|--------------|
| Initial subscription purchase | PAID | ACTIVE | ✅ Created |
| Renewal payment success | PAID | ACTIVE | ✅ Created |
| Payment failed | FAILED | PROCESSING | ✅ Created |
| Payment refunded | REFUNDED | INACTIVE | ✅ Created |
| Payment authorized (not captured) | PENDING | PROCESSING | ❌ Not created |

## Admin Review Queue

All payments have `reconciled` field:
- `reconciled = false` → Pending admin review
- `reconciled = true` → Approved by admin

Admin can:
1. Query payments where `reconciled = false`
2. Review payment details
3. Mark as `reconciled = true` after approval
