# Subscription Renewal Logic: Customer-Safe Water Delivery Model

> This is a very real subscription–logistics problem, and if you solve it cleanly, it actually becomes a **trust advantage** for your water app instead of a churn risk.
>
> I'll break this down practically—policy, system design, UX copy, and notification timing—so it works at scale and doesn't anger customers.

---

## 1. First Principle (Non-Negotiable)

> ⚠️ **WARNING:** Never block renewal because of adjustment. Blocking renewal = customer anxiety = churn.

**Instead, follow this golden sequence:**

1. ✅ **Renew first**
2. ✅ **Adjust immediately after**

> 💡 **Key Insight:** Your system must treat delivery variance as your operational risk, not the customer's fault.

---

## 2. Correct Mental Model (Very Important)

### ❌ Your subscription is NOT:

> "Pay for exactly X jars next month"

### ✅ It IS:

> "Pay for uninterrupted water service at a predictable monthly price"

> 📌 **Note:** That framing changes everything.

---

## 3. Wallet / Credit Ledger Model (Solves 80% of Pain)

Internally track **3 balances** per user:

| Balance Type | Description |
|-------------|-------------|
| **Subscription Paid Amount** | Amount charged for the subscription period |
| **Delivered Value** | Value of jars actually delivered |
| **Wallet Credit / Debit** | Pending credits or debits to be settled |

### 📊 Example Calculation

| Metric | Value |
|--------|-------|
| Subscription charged | 💰 ₹300 (10 jars × ₹30) |
| Delivered | 6 jars → 💵 ₹180 |
| Undelivered value | 💰 ₹120 |

> 🔔 **Result:** ₹120 becomes **Wallet Credit**, not "pending adjustment"

### 💰 Wallet Credit Usage Options

<details>
<summary>Click to expand usage options</summary>

- ✅ Auto-applied to next renewal
- ✅ Auto-applied to on-demand orders
- ✅ Refunded (only if user explicitly asks)

</details>

---

## 4. Renewal Flow (Customer-Safe & Calm)

### 📅 Timeline

| Time | Action | Notification |
|------|--------|--------------|
| **T-7 days** | Before subscription ends | Informational notification (no problem framing) |

### 📋 Notification Copy (Important)

> 💡 **Tip:** This builds trust instead of friction.

```
📅 Your water subscription renews in 7 days.
💰 You have ₹120 credit from last month that will be automatically adjusted.

CTA:
  • View details
  • Renew now
```

### 🧮 Renewal Calculation Logic

<details>
<summary>Click to see calculation example</summary>

**Scenario:**
- Next month estimate: ₹300
- Wallet credit: ₹120
- Payable amount shown: ₹180

**Customer sees:**
```
💵 ₹300 subscription
💰 – ₹120 credit
━━━━━━━━━━━━━━━
📌 ₹180 payable
```

No confusion. No anger.

</details>

---

## 5. Handling Incomplete Adjustments

> ⚠️ **This WILL happen. Handle it gracefully.**

### 📌 Rule:

1. **Freeze** the adjustment at renewal time
2. Use the **last confirmed** delivery count
3. Any late delivery updates go to **next cycle credit**

> 💡 **Customer Experience:** Customers should never wait for your ops system to "settle".

---

## 6. Customer Cancellation Options

Still no conflict. Offer **3 clear options**:

| Option | Timeline | Notes |
|--------|----------|-------|
| Auto-refund to original payment method | 3–5 days | Standard refund process |
| Keep as wallet balance | Instant | 🎯 Default selection (least friction) |
| Convert to on-demand orders | Instant | For immediate needs |

> 📌 **Default Selection:** Wallet balance (least friction)

---

## 7. Vendor Failure Protection (Very Important)

### ⚠️ Trigger Conditions

If non-delivery is due to:

- Vendor unavailable
- Delivery skipped by vendor
- App/system issue

### ✅ Required Actions

> 🔔 **Mark jars as Vendor-Fault Undelivered**

These must **always convert to credit automatically** — never ask user to "raise a complaint".

> 💡 **Why?** This protects your brand reputation.

---

## 8. UX Guidelines (How to Show This Without Confusion)

### 📱 Subscription Screen Mockup

```markdown
Plan: Monthly Water Subscription
Estimated jars: 10
Delivered so far: 6
Unused value: 💰 ₹120 (auto-adjusted)
```

### 💳 Wallet Screen Mockup

```markdown
Wallet Balance: 💰 ₹120
Source: Undelivered jars (Jan)
Usage: Auto-applied to next renewal
```

### 🔤 Word Choice Comparison

| ❌ Avoid Words | ✅ Use Instead |
|---------------|----------------|
| Pending | Credit |
| Failed | Auto-adjusted |
| Adjustment required | Carried forward |

---

## 9. Business Rule Summary (Implementation Guide)

### 🌟 Golden Rules

| # | Rule | Priority |
|---|------|----------|
| 1 | Never block renewal due to adjustment | 🔴 Critical |
| 2 | Always convert undelivered jars → wallet credit | 🔴 Critical |
| 3 | Auto-apply credit before asking for money | 🟡 High |
| 4 | Notify early, but calmly | 🟢 Medium |
| 5 | Freeze calculations at renewal time | 🟡 High |

<details>
<summary>Click to expand detailed business rules</summary>

### Extended Business Rules

1. **Notification Timing**
   - Send first renewal reminder 7 days before
   - Send second reminder 2 days before
   - Send final reminder 1 day before

2. **Credit Expiration**
   - Wallet credits expire after 90 days
   - Notify user 30 days before expiration

3. **Refund Policy**
   - Refunds processed within 3-5 business days
   - Original payment method only

4. **Vendor Fault Handling**
   - Automatic credit generation within 24 hours
   - No manual complaint required

</details>

---

## 10. Why Customers Won't Leave (Psychology)

> 💡 **This approach makes customers feel:**

| Feeling | How We Deliver It |
|---------|-------------------|
| **Fairness** | They're not being overcharged |
| **Transparency** | The system is fair and transparent |
| **Trust** | They don't have to fight for refunds |
| **Continuity** | Water supply feels "continuous", not transactional |

> 🎯 **Goal:** That's exactly what a utility-style app must feel like.

---

## Next Steps

I can help you with:

| # | Option | Description |
|---|--------|-------------|
| 1 | 📊 Design exact DB schema | Subscription + wallet tables |
| 2 | 🔄 Create state machine | Subscription lifecycle management |
| 3 | 📲 Write notification templates | FCM / WhatsApp / SMS templates |
| 4 | 🧪 Simulate edge cases | Paused days, holidays, vendor change |

---

> 📌 **Document Version:** 1.0  
> 📅 **Last Updated:** 2026-02-03
