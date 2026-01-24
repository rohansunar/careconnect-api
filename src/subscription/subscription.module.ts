import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { CustomerSubscriptionController } from './controllers/customer-subscription.controller';
import { AdminSubscriptionController } from './controllers/admin-subscription.controller';
import { CustomerSubscriptionService } from './services/customer-subscription.service';
import { AdminSubscriptionService } from './services/admin-subscription.service';
import { DeliveryFrequencyService } from './services/delivery-frequency.service';
import { PriceCalculationService } from './services/price-calculation.service';
import { PaymentModeService } from './services/payment-mode.service';
import { SubscriptionValidationService } from './services/subscription-validation.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerSubscriptionController, AdminSubscriptionController],
  providers: [
    CustomerSubscriptionService,
    AdminSubscriptionService,
    DeliveryFrequencyService,
    PriceCalculationService,
    PaymentModeService,
    SubscriptionValidationService,
  ],
  exports: [CustomerSubscriptionService],
})
export class SubscriptionModule {}
