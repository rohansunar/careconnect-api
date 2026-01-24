# Documentation Updates

## Overview

This document outlines the updates required for the documentation to reflect the changes made to the `createSubscription` endpoint and its associated services. The goal is to ensure that the documentation is accurate, comprehensive, and up-to-date.

## Updates Required

### 1. Swagger/OpenAPI Documentation

**Action**: Update the Swagger/OpenAPI documentation for the `createSubscription` endpoint to reflect the new response structure and payment mode integration.

**Changes**:
- Update the response schema to include the new fields (`total_price`, `payment_mode`).
- Add descriptions for the new fields.
- Ensure the example responses are updated to reflect the new structure.

**Example**:
```typescript
@ApiOperation({
  summary: 'Create a new subscription',
  description: 'Creates a new subscription for the authenticated customer.',
})
@ApiBody({
  type: CreateSubscriptionDto,
})
@ApiResponse({
  status: 201,
  description: 'Subscription created successfully.',
  schema: {
    example: {
      id: 'uuid',
      customerAddressId: 'uuid',
      vendorId: 'uuid',
      productId: 'uuid',
      quantity: 1,
      frequency: 'DAILY',
      custom_days: [],
      next_delivery_date: '2026-01-25T00:00:00.000Z',
      start_date: '2026-01-24T00:00:00.000Z',
      total_price: 100.00,
      payment_mode: 'UPFRONT',
      status: 'ACTIVE',
      created_at: '2026-01-24T00:00:00.000Z',
      updated_at: '2026-01-24T00:00:00.000Z',
    },
  },
})
```

### 2. Inline Comments

**Action**: Add inline comments for complex logic, such as price calculation and payment mode resolution.

**Example**:
```typescript
// Calculate the total price based on quantity, price per unit, frequency, and proration
const totalPrice = this.priceCalculationService.calculateTotalPrice(
  dto.quantity,
  product.price,
  dto.frequency,
  new Date(dto.start_date),
);

// Retrieve the payment mode from the configuration
const paymentMode = this.paymentModeService.getPaymentMode();
```

### 3. Service Documentation

**Action**: Add documentation for the new services (`PriceCalculationService`, `PaymentModeService`, `SubscriptionValidationService`).

**Example**:
```typescript
/**
 * Service responsible for calculating the total price of a subscription.
 * This service adheres to the Single Responsibility Principle (SRP) by focusing solely on price calculation.
 */
@Injectable()
export class PriceCalculationService implements IPriceCalculationService {
  // Implementation details
}
```

### 4. Update README

**Action**: Update the README file to include information about the new services and the refactored architecture.

**Changes**:
- Add a section describing the new services and their responsibilities.
- Include a diagram or flowchart to illustrate the new architecture.
- Update the setup and usage instructions if necessary.

### 5. Update Existing Documentation

**Action**: Review and update existing documentation to ensure it reflects the changes made.

**Files to Review**:
- `plans/subscription/refactored_architecture.md`
- `plans/subscription/response_structure.md`
- `plans/subscription/payment_mode_logic.md`
- `plans/subscription/decoupling_business_logic.md`
- `plans/subscription/cleanup_optimization.md`

### 6. Add Examples

**Action**: Add examples to the documentation to illustrate how to use the new services and endpoints.

**Example**:
```typescript
// Example of creating a subscription with the new response structure
const subscription = await customerSubscriptionService.createSubscription(user, {
  productId: 'product-uuid',
  quantity: 1,
  frequency: SubscriptionFrequency.DAILY,
  start_date: '2026-01-24',
});

console.log(subscription);
// Output:
// {
//   id: 'subscription-uuid',
//   customerAddressId: 'address-uuid',
//   vendorId: 'vendor-uuid',
//   productId: 'product-uuid',
//   quantity: 1,
//   frequency: 'DAILY',
//   custom_days: [],
//   next_delivery_date: '2026-01-25T00:00:00.000Z',
//   start_date: '2026-01-24T00:00:00.000Z',
//   total_price: 100.00,
//   payment_mode: 'UPFRONT',
//   status: 'ACTIVE',
//   created_at: '2026-01-24T00:00:00.000Z',
//   updated_at: '2026-01-24T00:00:00.000Z',
// }
```

### 7. Update Error Handling Documentation

**Action**: Update the documentation to include information about error handling and validation.

**Changes**:
- Add a section describing the validation rules for the `createSubscription` endpoint.
- Include examples of error responses and how to handle them.

**Example**:
```typescript
@ApiResponse({
  status: 400,
  description: 'Invalid input data.',
  schema: {
    example: {
      statusCode: 400,
      message: 'Custom days are required for CUSTOM_DAYS frequency',
      error: 'Bad Request',
    },
  },
})
```

### 8. Update Test Documentation

**Action**: Update the test documentation to reflect the new test cases and testing considerations.

**Changes**:
- Add a section describing the new test cases for the `createSubscription` endpoint.
- Include examples of test cases for full-month and mid-month subscription starts, both payment modes, and invalid inputs.

**Example**:
```typescript
// Test case for full-month subscription start
describe('createSubscription', () => {
  it('should calculate the correct total price for a full-month subscription', async () => {
    const result = await customerSubscriptionService.createSubscription(user, {
      productId: 'product-uuid',
      quantity: 1,
      frequency: SubscriptionFrequency.DAILY,
      start_date: '2026-01-01',
    });

    expect(result.total_price).toBe(3000); // Assuming price per unit is 100
  });
});
```

## Next Steps

- Update the Swagger/OpenAPI documentation for the `createSubscription` endpoint.
- Add inline comments for complex logic.
- Add documentation for the new services.
- Update the README file to include information about the new services and the refactored architecture.
- Review and update existing documentation to ensure it reflects the changes made.
- Add examples to the documentation to illustrate how to use the new services and endpoints.
- Update the error handling documentation to include information about validation and error responses.
- Update the test documentation to reflect the new test cases and testing considerations.