import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { PaymentProviderService } from './services/payment-provider.service';
import { CqrsModule } from '@nestjs/cqrs';

/**
 * PaymentModule handles payment-related operations.
 *
 * Imports:
 * - PrismaModule: For database access
 * - NotificationModule: For sending payment notifications
 *
 * Provides:
 * - PaymentService: Core payment processing logic
 * - PaymentProviderService: Payment gateway integration
 */
@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentProviderService],
  exports: [PaymentService, PaymentProviderService],
})
export class PaymentModule {}
