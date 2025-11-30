import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    VendorController,
  ],
  providers: [
    VendorService,
  ],
  exports: [VendorService],
})
export class VendorModule {}
