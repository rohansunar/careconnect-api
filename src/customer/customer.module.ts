import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { CustomerController } from './controllers/customer.controller';
import { CustomerService } from './services/customer.service';
import { CustomerAddressController } from './controllers/customer-address.controller';
import { CustomerAddressService } from './services/customer-address.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerController, CustomerAddressController],
  providers: [CustomerService, CustomerAddressService],
  exports: [CustomerService, CustomerAddressService],
})
export class CustomerModule {}
