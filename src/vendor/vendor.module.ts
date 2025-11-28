import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { OtpModule } from '../otp/otp.module';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { VendorAuthController } from './controllers/vendor-auth.controller';
import { VendorAuthService } from './services/vendor-auth.service';

@Module({
  imports: [PrismaModule, OtpModule],
  controllers: [VendorController, VendorAuthController],
  providers: [VendorService, VendorAuthService],
  exports: [VendorService],
})
export class VendorModule {}
