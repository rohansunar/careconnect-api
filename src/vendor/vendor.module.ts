import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { VendorBankAccountController } from './controllers/vendor-bank-account.controller';
import { VendorBankAccountService } from './services/vendor-bank-account.service';
import { AddressController } from './controllers/address.controller';
import { AddressService } from './services/address.service';
import { CitiesModule } from '../cities/cities.module';

@Module({
  imports: [PrismaModule, CitiesModule],
  controllers: [
    VendorController,
    VendorBankAccountController,
    AddressController,
  ],
  providers: [VendorService, VendorBankAccountService, AddressService],
  exports: [VendorService, VendorBankAccountService, AddressService],
})
export class VendorModule {}
