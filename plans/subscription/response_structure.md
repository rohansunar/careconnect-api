# Response Structure and `total_price` Calculation Logic

## Response Structure

The structured response for the `createSubscription` endpoint will include the following fields:

```typescript
interface SubscriptionResponse {
  id: string;
  customerAddressId: string;
  vendorId: string;
  productId: string;
  quantity: number;
  frequency: SubscriptionFrequency;
  custom_days: DayOfWeek[];
  next_delivery_date: Date;
  start_date: Date;
  total_price: number;
  payment_mode: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}
```

### Fields Description
- **id**: Unique identifier for the subscription.
- **customerAddressId**: ID of the customer's address.
- **vendorId**: ID of the vendor providing the product.
- **productId**: ID of the product being subscribed to.
- **quantity**: Quantity of the product.
- **frequency**: Frequency of delivery (e.g., DAILY, ALTERNATIVE_DAYS, CUSTOM_DAYS).
- **custom_days**: Custom days for delivery (if applicable).
- **next_delivery_date**: Next scheduled delivery date.
- **start_date**: Start date of the subscription.
- **total_price**: Calculated total price for the subscription.
- **payment_mode**: Payment mode (e.g., UPFRONT, MONTHLY).
- **status**: Status of the subscription (e.g., ACTIVE, INACTIVE).
- **created_at**: Timestamp when the subscription was created.
- **updated_at**: Timestamp when the subscription was last updated.

## `total_price` Calculation Logic

The `total_price` will be calculated based on the following factors:

1. **Quantity**: Number of units of the product.
2. **Price per Unit**: Price of one unit of the product.
3. **Subscription Frequency**: How often the product is delivered.
4. **Proration for Mid-Month Start Dates**: Adjustment for subscriptions starting mid-month.

### Calculation Formula

```typescript
function calculateTotalPrice(
  quantity: number,
  pricePerUnit: number,
  frequency: SubscriptionFrequency,
  startDate: Date,
): number {
  // Base price calculation
  const basePrice = quantity * pricePerUnit;

  // Adjust for subscription frequency
  let frequencyMultiplier = 1;
  switch (frequency) {
    case SubscriptionFrequency.DAILY:
      frequencyMultiplier = 30; // Assuming 30 days in a month
      break;
    case SubscriptionFrequency.ALTERNATIVE_DAYS:
      frequencyMultiplier = 15; // Assuming 15 deliveries in a month
      break;
    case SubscriptionFrequency.CUSTOM_DAYS:
      // For custom days, calculate based on the number of days selected
      // This is a placeholder; actual logic will depend on the custom days
      frequencyMultiplier = 10; // Example value
      break;
  }

  // Calculate proration for mid-month start dates
  const prorationFactor = calculateProrationFactor(startDate);

  // Final total price
  const totalPrice = basePrice * frequencyMultiplier * prorationFactor;

  return totalPrice;
}

function calculateProrationFactor(startDate: Date): number {
  const startDayOfMonth = startDate.getDate();
  const daysInMonth = new Date(
    startDate.getFullYear(),
    startDate.getMonth() + 1,
    0,
  ).getDate();

  // Proration factor is the ratio of remaining days in the month to total days in the month
  const remainingDays = daysInMonth - startDayOfMonth + 1;
  const prorationFactor = remainingDays / daysInMonth;

  return prorationFactor;
}
```

### Example Calculations

1. **Full-Month Subscription**:
   - Start Date: 2026-01-01
   - Proration Factor: 1 (no adjustment needed)
   - Total Price: `basePrice * frequencyMultiplier * 1`

2. **Mid-Month Subscription**:
   - Start Date: 2026-01-15
   - Proration Factor: 0.5 (assuming 30 days in the month)
   - Total Price: `basePrice * frequencyMultiplier * 0.5`

## Integration with Payment Mode

The `payment_mode` will be dynamically read from `payment-mode.config.json` and included in the response. This will be handled by the `PaymentModeService`.

## Next Steps

- Implement the `PriceCalculationService` to encapsulate the `total_price` calculation logic.
- Integrate the `PaymentModeService` to dynamically resolve the payment mode.
- Update the `CustomerSubscriptionService` to use these services and construct the structured response.