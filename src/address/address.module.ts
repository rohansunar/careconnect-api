import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { AddressController } from './controllers/address.controller';
import { AddressService } from './services/address.service';

@Module({
  imports: [PrismaModule],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [],
})
export class AddressModule {}
