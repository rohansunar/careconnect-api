import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { PaymentProviderService } from './services/payment-provider.service';
import { OrderModule } from '../order/order.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [PrismaModule, forwardRef(() => OrderModule), CartModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentProviderService],
  exports: [PaymentService],
})
export class PaymentModule {}
