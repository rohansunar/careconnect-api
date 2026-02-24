import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { VendorPayoutCronService } from './services/vendor-payout-cron.service';
import { VendorQueryService } from './services/vendor-query.service';
import { PayoutCalculatorService } from './services/payout-calculator.service';
import { PayoutRecordService } from './services/payout-record.service';
import { PayoutNotificationService } from './services/payout-notification.service';

// Controllers
import { VendorPayoutController } from './controllers/vendor-payout.controller';

// Prisma
import { PrismaModule } from '../common/database/prisma.module';

// Notification Module
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ConfigModule, PrismaModule, NotificationModule],
  controllers: [VendorPayoutController],
  providers: [
    VendorPayoutCronService,
    VendorQueryService,
    PayoutCalculatorService,
    PayoutRecordService,
    PayoutNotificationService,
  ],
  exports: [
    VendorPayoutCronService,
    VendorQueryService,
    PayoutCalculatorService,
    PayoutRecordService,
    PayoutNotificationService,
  ],
})
export class VendorPayoutModule {}
