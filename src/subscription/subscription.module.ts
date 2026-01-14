import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { CustomerSubscriptionController } from './controllers/customer-subscription.controller';
import { CustomerSubscriptionService } from './services/customer-subscription.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerSubscriptionController],
  providers: [CustomerSubscriptionService],
  exports: [CustomerSubscriptionService],
})
export class SubscriptionModule {}