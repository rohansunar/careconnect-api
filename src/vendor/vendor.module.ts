import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { VendorBankAccountController } from './controllers/vendor-bank-account.controller';
import { VendorBankAccountService } from './services/vendor-bank-account.service';

@Module({
  imports: [PrismaModule],
  controllers: [VendorController, VendorBankAccountController],
  providers: [VendorService, VendorBankAccountService],
  exports: [VendorService, VendorBankAccountService],
})
export class VendorModule {}
