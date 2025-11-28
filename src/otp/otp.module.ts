import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { OtpService } from './services/otp.service';

@Module({
  imports: [PrismaModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
