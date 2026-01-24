# Decoupling Business Logic into Separate Services

## Overview

The current implementation of `CustomerSubscriptionService` handles multiple concerns, including input validation, price calculation, and subscription creation. To adhere to the Single Responsibility Principle (SRP), we will decouple these concerns into separate services.

## New Services

### 1. PriceCalculationService

**Responsibility**: Calculate the `total_price` for a subscription.

**Interface**:
```typescript
interface PriceCalculationService {
  calculateTotalPrice(
    quantity: number,
    pricePerUnit: number,
    frequency: SubscriptionFrequency,
    startDate: Date,
  ): number;
}
```

**Implementation**:
```typescript
import { Injectable } from '@nestjs/common';
import { SubscriptionFrequency } from '../interfaces/delivery-frequency.interface';

@Injectable()
export class PriceCalculationService implements IPriceCalculationService {
  calculateTotalPrice(
    quantity: number,
    pricePerUnit: number,
    frequency: SubscriptionFrequency,
    startDate: Date,
  ): number {
    const basePrice = quantity * pricePerUnit;
    const frequencyMultiplier = this.getFrequencyMultiplier(frequency);
    const prorationFactor = this.calculateProrationFactor(startDate);

    return basePrice * frequencyMultiplier * prorationFactor;
  }

  private getFrequencyMultiplier(frequency: SubscriptionFrequency): number {
    switch (frequency) {
      case SubscriptionFrequency.DAILY:
        return 30; // Assuming 30 days in a month
      case SubscriptionFrequency.ALTERNATIVE_DAYS:
        return 15; // Assuming 15 deliveries in a month
      case SubscriptionFrequency.CUSTOM_DAYS:
        return 10; // Example value
      default:
        throw new Error('Invalid frequency type');
    }
  }

  private calculateProrationFactor(startDate: Date): number {
    const startDayOfMonth = startDate.getDate();
    const daysInMonth = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0,
    ).getDate();

    const remainingDays = daysInMonth - startDayOfMonth + 1;
    return remainingDays / daysInMonth;
  }
}
```

### 2. PaymentModeService

**Responsibility**: Read and resolve the payment mode from the configuration file.

**Interface**:
```typescript
interface PaymentModeService {
  getPaymentMode(): string;
  validatePaymentMode(paymentMode: string): boolean;
}
```

**Implementation**:
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

### 3. SubscriptionValidationService

**Responsibility**: Validate input data for creating a subscription.

**Interface**:
```typescript
interface SubscriptionValidationService {
  validateSubscriptionInputs(
    dto: CreateSubscriptionDto,
    user: User,
  ): Promise<{ customerAddress: any; product: any }>;
}
```

**Implementation**:
```typescript
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import type { User } from '../../common/interfaces/user.interface';
import { DeliveryFrequencyService } from './delivery-frequency.service';

@Injectable()
export class SubscriptionValidationService implements ISubscriptionValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryFrequencyService: DeliveryFrequencyService,
  ) {}

  async validateSubscriptionInputs(
    dto: CreateSubscriptionDto,
    user: User,
  ): Promise<{ customerAddress: any; product: any }> {
    const customerAddress = await this.prisma.customerAddress.findFirst({
      where: { customerId: user.id, is_active: true, isDefault: true },
    });

    if (!customerAddress) {
      throw new NotFoundException('Customer Address not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    this.deliveryFrequencyService.validateFrequency(
      dto.frequency,
      dto.custom_days,
    );

    return { customerAddress, product };
  }
}
```

## Refactored CustomerSubscriptionService

**Updated Implementation**:
```typescript
import { Injectable, NotFoundException, ForbiddenException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import type { User } from '../../common/interfaces/user.interface';
import { DeliveryFrequencyService } from './delivery-frequency.service';
import { PriceCalculationService } from './price-calculation.service';
import { PaymentModeService } from './payment-mode.service';
import { SubscriptionValidationService } from './subscription-validation.service';
import { SubscriptionFrequency } from '../interfaces/delivery-frequency.interface';

@Injectable()
export class CustomerSubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryFrequencyService: DeliveryFrequencyService,
    private readonly priceCalculationService: PriceCalculationService,
    private readonly paymentModeService: PaymentModeService,
    private readonly subscriptionValidationService: SubscriptionValidationService,
  ) {}

  async createSubscription(user: User, dto: CreateSubscriptionDto) {
    const { customerAddress, product } = await this.subscriptionValidationService.validateSubscriptionInputs(dto, user);

    const customDays =
      dto.frequency === SubscriptionFrequency.CUSTOM_DAYS
        ? dto.custom_days
        : [];
    const nextDeliveryDate = this.deliveryFrequencyService.getNextDeliveryDate(
      new Date(dto.start_date),
      dto.frequency,
      customDays,
    );

    const totalPrice = this.priceCalculationService.calculateTotalPrice(
      dto.quantity,
      product.price, // Assuming product has a price field
      dto.frequency,
      new Date(dto.start_date),
    );

    const paymentMode = this.paymentModeService.getPaymentMode();

    let hasDuplicate;
    try {
      hasDuplicate = await this.prisma.subscription.findFirst({
        where: {
          customerAddressId: customerAddress.id,
          productId: dto.productId,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to check for duplicate subscription',
      );
    }

    if (hasDuplicate) {
      throw new ConflictException(
        'A subscription for this product already exists for this customer address.',
      );
    }

    try {
      return this.prisma.subscription.create({
        data: {
          customerAddressId: customerAddress.id,
          vendorId: product.vendorId,
          productId: dto.productId,
          quantity: dto.quantity,
          frequency: dto.frequency,
          custom_days: customDays,
          next_delivery_date: nextDeliveryDate,
          start_date: new Date(dto.start_date),
          total_price: totalPrice,
          payment_mode: paymentMode,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  // Other methods remain unchanged
}
```

## Dependency Injection

The new services will be injected into `CustomerSubscriptionService` using NestJS's dependency injection system. This ensures that the services are loosely coupled and can be easily replaced or extended.

## Benefits of Decoupling

1. **Single Responsibility Principle (SRP)**: Each service has a single responsibility.
2. **Open/Closed Principle (OCP)**: Services are open for extension but closed for modification.
3. **Dependency Inversion Principle (DIP)**: High-level modules depend on abstractions, not concrete implementations.
4. **Easier Testing**: Each service can be tested independently.
5. **Maintainability**: Changes to one service do not affect others.

## Next Steps

- Implement the new services as described.
- Update `CustomerSubscriptionService` to use these services.
- Write test cases for each service.
- Ensure backward compatibility and no breaking changes to existing functionality.