import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { VendorPayoutCronService } from './services/vendor-payout-cron.service';

// Prisma
import { PrismaModule } from '../common/database/prisma.module';

// Notification Module
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ConfigModule, PrismaModule, NotificationModule],
  providers: [VendorPayoutCronService],
  exports: [VendorPayoutCronService],
})
export class VendorPayoutModule {}
