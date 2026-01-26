
# Subscription Order System – Technical Implementation Guide

## 1. Queue Worker Code Structure (BullMQ + Node.js)

### Queue Setup
```ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({ host: 'localhost', port: 6379 });
export const orderQueue = new Queue('order-generation', { connection });
```

### Cron Job (Producer)
```ts
// Runs at 9:00 AM
const subscriptions = await prisma.subscription.findMany({
  where: { nextOrderDate: new Date(), isActive: true },
  select: { id: true },
  take: 5000
});

for (const sub of subscriptions) {
  await orderQueue.add('create-order', { subscriptionId: sub.id });
}
```

### Worker (Consumer)
```ts
import { Worker } from 'bullmq';

new Worker('order-generation', async job => {
  const { subscriptionId } = job.data;
  await createOrderFromSubscription(subscriptionId);
}, { connection, concurrency: 20 });
```

### Order Creation Logic
```ts
async function createOrderFromSubscription(subscriptionId: string) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId }});

  await prisma.order.create({
    data: {
      subscriptionId,
      customerId: sub.customerId,
      productId: sub.productId,
      deliveryDate: new Date(),
      status: 'SCHEDULED'
    }
  });

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { nextOrderDate: calculateNextDate(sub) }
  });
}
```

---

## 2. Billing Calculation Logic

### Upfront Billing Adjustment
```ts
const delivered = await prisma.order.count({
  where: { subscriptionId, status: 'DELIVERED', month }
});

const missed = await prisma.order.count({
  where: { subscriptionId, status: 'MISSED', month }
});

const adjustment = missed * pricePerUnit;
```

### Postpaid Monthly Billing
```ts
const orders = await prisma.order.findMany({
  where: { customerId, status: 'DELIVERED', month }
});

const totalAmount = orders.reduce((sum, o) => sum + o.price, 0);

await prisma.invoice.create({
  data: { customerId, totalAmount, status: 'PENDING' }
});
```

---

## 3. Workflow Logic Diagram

```
          ┌───────────────┐
          │   9 AM Cron   │
          └──────┬────────┘
                 ↓
     Fetch Subscriptions Due Today
                 ↓
        Push Jobs to Queue (Redis)
                 ↓
       Workers Process in Parallel
                 ↓
          Orders Created in DB
                 ↓
        Vendors Notified for Delivery
                 ↓
     Delivery Status Updated (Day End)
                 ↓
         Billing & Adjustments Engine
```

---

## 4. Infrastructure Sizing Guide (Single VPS)

### 🔹 10,000 Orders/Day
- VPS: 2 vCPU / 4GB RAM
- Postgres on same server
- Redis local instance
- Single worker (concurrency 10)

### 🔹 50,000 Orders/Day
- VPS: 4 vCPU / 8GB RAM
- Postgres tuned with indexes
- Redis local
- Worker concurrency 20–30

### 🔹 1,00,000 – 1,50,000 Orders/Day
- VPS: 8 vCPU / 16GB RAM minimum
- Separate process for workers (PM2 cluster)
- Redis maxmemory 1GB
- PostgreSQL shared_buffers increased
- Batch inserts required

---

## 5. Estimated Order Creation Time by Infrastructure Size

These are **realistic production-safe estimates** assuming:
• Proper indexing  
• Batch inserts  
• No heavy external API calls inside order creation  

### ⏱ Average Time to Create ONE Order
| Server Size | Avg Time per Order |
|-------------|-------------------|
| 2 vCPU / 4GB | 8–12 ms |
| 4 vCPU / 8GB | 4–6 ms |
| 8 vCPU / 16GB | 2–4 ms |

---

### 🚀 Total Processing Time Based on Subscription Volume

#### 🔹 10,000 Subscriptions
| Server | Workers | Est. Completion Time |
|--------|---------|----------------------|
| 2 vCPU | 10 concurrency | 8–12 minutes |
| 4 vCPU | 20 concurrency | 4–6 minutes |
| 8 vCPU | 30 concurrency | 2–4 minutes |

#### 🔹 50,000 Subscriptions
| Server | Workers | Est. Completion Time |
|--------|---------|----------------------|
| 2 vCPU | 10 concurrency | 45–60 minutes |
| 4 vCPU | 25 concurrency | 15–25 minutes |
| 8 vCPU | 40 concurrency | 8–12 minutes |

#### 🔹 1,00,000 Subscriptions
| Server | Workers | Est. Completion Time |
|--------|---------|----------------------|
| 4 vCPU | 25 concurrency | 35–50 minutes |
| 8 vCPU | 40 concurrency | 15–22 minutes |

#### 🔹 1,50,000 Subscriptions
| Server | Workers | Est. Completion Time |
|--------|---------|----------------------|
| 4 vCPU | 30 concurrency | 55–75 minutes |
| 8 vCPU | 50 concurrency | 22–30 minutes |

---

## ⚙️ Processing Window Recommendation

To finish within **9 AM – 10 AM batch window**:

| Subscription Count | Minimum Recommended VPS |
|--------------------|--------------------------|
| Up to 20k | 4 vCPU / 8GB |
| 20k – 80k | 8 vCPU / 16GB |
| 80k – 1.5L | 8 vCPU / 16GB + optimized batching |

---

## Scaling Rule of Thumb
Scale **workers first**, database second, cron frequency never.
DB tuning parameters (shared_buffers, work_mem, etc.)
Queue retry & failure strategy