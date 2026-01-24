import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { CustomerSubscriptionController } from './controllers/customer-subscription.controller';
import { AdminSubscriptionController } from './controllers/admin-subscription.controller';
import { CustomerSubscriptionService } from './services/customer-subscription.service';
import { AdminSubscriptionService } from './services/admin-subscription.service';
import { DeliveryFrequencyService } from './services/delivery-frequency.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerSubscriptionController, AdminSubscriptionController],
  providers: [
    CustomerSubscriptionService,
    AdminSubscriptionService,
    DeliveryFrequencyService,
  ],
  exports: [CustomerSubscriptionService],
})
export class SubscriptionModule {}
