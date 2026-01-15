import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { CustomerSubscriptionController } from './controllers/customer-subscription.controller';
import { CustomerSubscriptionService } from './services/customer-subscription.service';
import { DeliveryFrequencyService } from './services/delivery-frequency.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerSubscriptionController],
  providers: [CustomerSubscriptionService, DeliveryFrequencyService],
  exports: [CustomerSubscriptionService],
})
export class SubscriptionModule {}
