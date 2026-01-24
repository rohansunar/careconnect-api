# Testing Considerations

## Overview

This document outlines the testing considerations for the refactored `createSubscription` endpoint and its associated services. The goal is to ensure that all functionality is thoroughly tested and that the system behaves as expected under various conditions.

## Test Cases

### 1. Full-Month Subscription Start

**Description**: Test the creation of a subscription that starts at the beginning of the month.

**Test Case**:
```typescript
describe('createSubscription', () => {
  it('should calculate the correct total price for a full-month subscription', async () => {
    const result = await customerSubscriptionService.createSubscription(user, {
      productId: 'product-uuid',
      quantity: 1,
      frequency: SubscriptionFrequency.DAILY,
      start_date: '2026-01-01',
    });

    expect(result.total_price).toBe(3000); // Assuming price per unit is 100
    expect(result.payment_mode).toBe('UPFRONT');
  });
});
```

### 2. Mid-Month Subscription Start

**Description**: Test the creation of a subscription that starts mid-month.

**Test Case**:
```typescript
describe('createSubscription', () => {
  it('should calculate the correct total price for a mid-month subscription', async () => {
    const result = await customerSubscriptionService.createSubscription(user, {
      productId: 'product-uuid',
      quantity: 1,
      frequency: SubscriptionFrequency.DAILY,
      start_date: '2026-01-15',
    });

    expect(result.total_price).toBe(1500); // Assuming price per unit is 100 and proration factor is 0.5
    expect(result.payment_mode).toBe('UPFRONT');
  });
});
```

### 3. Both Payment Modes

**Description**: Test the creation of subscriptions with both payment modes (`UPFRONT` and `MONTHLY`).

**Test Case**:
```typescript
describe('createSubscription', () => {
  it('should use the UPFRONT payment mode', async () => {
    const result = await customerSubscriptionService.createSubscription(user, {
      productId: 'product-uuid',
      quantity: 1,
      frequency: SubscriptionFrequency.DAILY,
      start_date: '2026-01-01',
    });

    expect(result.payment_mode).toBe('UPFRONT');
  });

  it('should use the MONTHLY payment mode', async () => {
    // Update the payment mode configuration to MONTHLY
    fs.writeFileSync(
      path.join(__dirname, '../../../config/payment-mode.config.json'),
      JSON.stringify({ payment_mode: 'MONTHLY' }),
    );

    const result = await customerSubscriptionService.createSubscription(user, {
      productId: 'product-uuid',
      quantity: 1,
      frequency: SubscriptionFrequency.DAILY,
      start_date: '2026-01-01',
    });

    expect(result.payment_mode).toBe('MONTHLY');
  });
});
```

### 4. Invalid Inputs

**Description**: Test the handling of invalid inputs.

**Test Cases**:
```typescript
describe('createSubscription', () => {
  it('should throw an error for invalid product ID', async () => {
    await expect(
      customerSubscriptionService.createSubscription(user, {
        productId: 'invalid-product-uuid',
        quantity: 1,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-01-01',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw an error for invalid quantity', async () => {
    await expect(
      customerSubscriptionService.createSubscription(user, {
        productId: 'product-uuid',
        quantity: -1,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-01-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw an error for invalid start date', async () => {
    await expect(
      customerSubscriptionService.createSubscription(user, {
        productId: 'product-uuid',
        quantity: 1,
        frequency: SubscriptionFrequency.DAILY,
        start_date: 'invalid-date',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw an error for invalid frequency', async () => {
    await expect(
      customerSubscriptionService.createSubscription(user, {
        productId: 'product-uuid',
        quantity: 1,
        frequency: 'INVALID_FREQUENCY' as any,
        start_date: '2026-01-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw an error for missing custom days', async () => {
    await expect(
      customerSubscriptionService.createSubscription(user, {
        productId: 'product-uuid',
        quantity: 1,
        frequency: SubscriptionFrequency.CUSTOM_DAYS,
        start_date: '2026-01-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw an error for duplicate subscription', async () => {
    // Create a subscription first
    await customerSubscriptionService.createSubscription(user, {
      productId: 'product-uuid',
      quantity: 1,
      frequency: SubscriptionFrequency.DAILY,
      start_date: '2026-01-01',
    });

    // Try to create the same subscription again
    await expect(
      customerSubscriptionService.createSubscription(user, {
        productId: 'product-uuid',
        quantity: 1,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-01-01',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
```

### 5. Price Calculation Service

**Description**: Test the `PriceCalculationService` to ensure it calculates the total price correctly.

**Test Cases**:
```typescript
describe('PriceCalculationService', () => {
  let priceCalculationService: PriceCalculationService;

  beforeEach(() => {
    priceCalculationService = new PriceCalculationService();
  });

  it('should calculate the total price for DAILY frequency', () => {
    const totalPrice = priceCalculationService.calculateTotalPrice(
      1,
      100,
      SubscriptionFrequency.DAILY,
      new Date('2026-01-01'),
    );

    expect(totalPrice).toBe(3000);
  });

  it('should calculate the total price for ALTERNATIVE_DAYS frequency', () => {
    const totalPrice = priceCalculationService.calculateTotalPrice(
      1,
      100,
      SubscriptionFrequency.ALTERNATIVE_DAYS,
      new Date('2026-01-01'),
    );

    expect(totalPrice).toBe(1500);
  });

  it('should calculate the total price for CUSTOM_DAYS frequency', () => {
    const totalPrice = priceCalculationService.calculateTotalPrice(
      1,
      100,
      SubscriptionFrequency.CUSTOM_DAYS,
      new Date('2026-01-01'),
    );

    expect(totalPrice).toBe(1000);
  });

  it('should calculate the proration factor for mid-month start date', () => {
    const totalPrice = priceCalculationService.calculateTotalPrice(
      1,
      100,
      SubscriptionFrequency.DAILY,
      new Date('2026-01-15'),
    );

    expect(totalPrice).toBe(1500);
  });
});
```

### 6. Payment Mode Service

**Description**: Test the `PaymentModeService` to ensure it reads and resolves the payment mode correctly.

**Test Cases**:
```typescript
describe('PaymentModeService', () => {
  let paymentModeService: PaymentModeService;

  beforeEach(() => {
    paymentModeService = new PaymentModeService();
  });

  it('should read the payment mode from the configuration file', () => {
    const paymentMode = paymentModeService.getPaymentMode();

    expect(paymentMode).toBe('UPFRONT');
  });

  it('should validate the payment mode', () => {
    const isValid = paymentModeService.validatePaymentMode('UPFRONT');

    expect(isValid).toBe(true);
  });

  it('should return false for invalid payment mode', () => {
    const isValid = paymentModeService.validatePaymentMode('INVALID_MODE');

    expect(isValid).toBe(false);
  });

  it('should throw an error if the configuration file is missing', () => {
    // Mock the fs.readFileSync to throw an error
    jest.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
      throw new Error('File not found');
    });

    expect(() => new PaymentModeService()).toThrow(InternalServerErrorException);
  });
});
```

### 7. Subscription Validation Service

**Description**: Test the `SubscriptionValidationService` to ensure it validates the subscription inputs correctly.

**Test Cases**:
```typescript
describe('SubscriptionValidationService', () => {
  let subscriptionValidationService: SubscriptionValidationService;

  beforeEach(() => {
    subscriptionValidationService = new SubscriptionValidationService(
      new PrismaService(),
      new DeliveryFrequencyService(),
    );
  });

  it('should validate the subscription inputs', async () => {
    const result = await subscriptionValidationService.validateSubscriptionInputs(
      {
        productId: 'product-uuid',
        quantity: 1,
        frequency: SubscriptionFrequency.DAILY,
        start_date: '2026-01-01',
      },
      user,
    );

    expect(result.customerAddress).toBeDefined();
    expect(result.product).toBeDefined();
  });

  it('should throw an error if the customer address is not found', async () => {
    // Mock the prisma.customerAddress.findFirst to return null
    jest
      .spyOn(prisma.customerAddress, 'findFirst')
      .mockResolvedValueOnce(null);

    await expect(
      subscriptionValidationService.validateSubscriptionInputs(
        {
          productId: 'product-uuid',
          quantity: 1,
          frequency: SubscriptionFrequency.DAILY,
          start_date: '2026-01-01',
        },
        user,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw an error if the product is not found', async () => {
    // Mock the prisma.product.findUnique to return null
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValueOnce(null);

    await expect(
      subscriptionValidationService.validateSubscriptionInputs(
        {
          productId: 'invalid-product-uuid',
          quantity: 1,
          frequency: SubscriptionFrequency.DAILY,
          start_date: '2026-01-01',
        },
        user,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw an error if the frequency is invalid', async () => {
    await expect(
      subscriptionValidationService.validateSubscriptionInputs(
        {
          productId: 'product-uuid',
          quantity: 1,
          frequency: 'INVALID_FREQUENCY' as any,
          start_date: '2026-01-01',
        },
        user,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw an error if the custom days are missing for CUSTOM_DAYS frequency', async () => {
    await expect(
      subscriptionValidationService.validateSubscriptionInputs(
        {
          productId: 'product-uuid',
          quantity: 1,
          frequency: SubscriptionFrequency.CUSTOM_DAYS,
          start_date: '2026-01-01',
        },
        user,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
```

## Next Steps

- Implement the test cases as described.
- Ensure all test cases pass and cover the expected functionality.
- Update the documentation to reflect the testing considerations.