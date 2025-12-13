import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { PaymentProviderService } from './services/payment-provider.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentProviderService],
  exports: [PaymentService],
})
export class PaymentModule {}