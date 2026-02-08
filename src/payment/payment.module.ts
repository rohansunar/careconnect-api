import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { PaymentProviderService } from './services/payment-provider.service';
import { WebhookIdempotencyService } from './services/webhook-idempotency.service';
import { CqrsModule } from '@nestjs/cqrs';

/**
 * PaymentModule handles payment-related operations.
 *
 * Imports:
 * - PrismaModule: For database access
 * - CqrsModule: For event-driven architecture
 *
 * Provides:
 * - PaymentService: Core payment processing logic
 * - PaymentProviderService: Payment gateway integration
 * - WebhookIdempotencyService: Idempotency guard for webhook processing
 */
@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentProviderService,
    WebhookIdempotencyService,
  ],
  exports: [PaymentService, PaymentProviderService, WebhookIdempotencyService],
})
export class PaymentModule {}
