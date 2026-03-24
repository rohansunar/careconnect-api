import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { WalletModule } from '../wallet/wallet.module';
import { CustomerSubscriptionController } from './controllers/customer-subscription.controller';
import { AdminSubscriptionController } from './controllers/admin-subscription.controller';
import { CustomerSubscriptionService } from './services/customer-subscription.service';
import { AdminSubscriptionService } from './services/admin-subscription.service';
import { DeliveryFrequencyService } from './services/delivery-frequency.service';
import { PriceCalculationService } from './services/price-calculation.service';
import { PaymentModeService } from './services/payment-mode.service';
import { SubscriptionValidationService } from './services/subscription-validation.service';
import { SubscriptionRepositoryService } from './repositories/subscription.repository';
import { DeliveryFrequencyFactoryService } from './services/delivery-frequency/delivery-frequency.factory';
import { PriceCalculatorFactoryService } from './services/price-calculation/price-calculator.factory';
import { JsonPaymentModeRepository } from './services/payment-mode/payment-mode.repository';
import { OnPaymentSucceededSubscriptionHandler } from './services/handlers/on-payment-success-subscription.handler';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [
    CqrsModule,
    PrismaModule,
    NotificationModule,
    PaymentModule,
    WalletModule,
  ],
  controllers: [CustomerSubscriptionController, AdminSubscriptionController],
  providers: [
    CustomerSubscriptionService,
    AdminSubscriptionService,
    DeliveryFrequencyService,
    PriceCalculationService,
    PaymentModeService,
    SubscriptionValidationService,
    SubscriptionRepositoryService,
    DeliveryFrequencyFactoryService,
    PriceCalculatorFactoryService,
    JsonPaymentModeRepository,
    OnPaymentSucceededSubscriptionHandler,
  ],
  exports: [CustomerSubscriptionService, DeliveryFrequencyService],
})
export class SubscriptionModule {}
