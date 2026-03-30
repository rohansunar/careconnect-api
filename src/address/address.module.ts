import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { CustomerAddressController } from './controllers/customer-address.controller';
import { CustomerAddressService } from './services/customer-address.service';
import { VendorAddressController } from './controllers/vendor-address.controller';
import { VendorAddressService } from './services/vendor-address.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerAddressController, VendorAddressController],
  providers: [
    CustomerAddressService,
    VendorAddressService,
  ],
  exports: [],
})
export class AddressModule {}
