import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { VendorBankAccountController } from './controllers/vendor-bank-account.controller';
import { VendorBankAccountService } from './services/vendor-bank-account.service';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    VendorController,
    VendorBankAccountController,
    DashboardController,
  ],
  providers: [VendorService, VendorBankAccountService, DashboardService],
  exports: [VendorService, VendorBankAccountService, DashboardService],
})
export class VendorModule {}
