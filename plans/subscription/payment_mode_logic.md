# Payment Mode Logic for Dynamic Configuration

## Overview

The payment mode logic will dynamically read the payment mode configuration from `payment-mode.config.json` and integrate it into the response. This will be handled by a new service, `PaymentModeService`.

## Payment Mode Configuration

The `payment-mode.config.json` file currently contains:

```json
{ "payment_mode": "UPFRONT" }
```

### Supported Payment Modes

1. **UPFRONT**: Payment is made in full at the start of the subscription.
2. **MONTHLY**: Payment is made monthly.

## PaymentModeService

### Interface

```typescript
interface PaymentModeService {
  getPaymentMode(): string;
  validatePaymentMode(paymentMode: string): boolean;
}
```

### Implementation

```typescript
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PaymentModeService implements IPaymentModeService {
  private paymentMode: string;

  constructor() {
    this.loadPaymentMode();
  }

  private loadPaymentMode(): void {
    try {
      const configPath = path.join(
        __dirname,
        '../../../config/payment-mode.config.json',
      );
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      this.paymentMode = config.payment_mode;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to load payment mode configuration',
      );
    }
  }

  getPaymentMode(): string {
    return this.paymentMode;
  }

  validatePaymentMode(paymentMode: string): boolean {
    const validModes = ['UPFRONT', 'MONTHLY'];
    return validModes.includes(paymentMode);
  }
}
```

### Integration with CustomerSubscriptionService

The `PaymentModeService` will be injected into `CustomerSubscriptionService` and used to retrieve the payment mode for the subscription response.

```typescript
@Injectable()
export class CustomerSubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryFrequencyService: DeliveryFrequencyService,
    private readonly paymentModeService: PaymentModeService,
  ) {}

  async createSubscription(user: User, dto: CreateSubscriptionDto) {
    // Existing logic for creating subscription

    const paymentMode = this.paymentModeService.getPaymentMode();

    return {
      ...subscription,
      payment_mode: paymentMode,
    };
  }
}
```

## Error Handling

- **Configuration File Missing**: If the `payment-mode.config.json` file is missing or invalid, an `InternalServerErrorException` will be thrown.
- **Invalid Payment Mode**: If the payment mode in the configuration file is invalid, the service will log a warning and default to a valid mode (e.g., UPFRONT).

## Testing Considerations

- **Test Cases**:
  - Valid payment mode configuration.
  - Missing payment mode configuration file.
  - Invalid payment mode in configuration file.

## Next Steps

- Implement the `PaymentModeService` as described.
- Integrate the service into `CustomerSubscriptionService`.
- Update the response structure to include the payment mode.
- Write test cases for the `PaymentModeService`.