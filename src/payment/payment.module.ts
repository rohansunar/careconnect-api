import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { PaymentProviderService } from './services/payment-provider.service';
import { WebhookIdempotencyService } from './services/webhook-idempotency.service';
import { OnPaymentSucceededWalletHandler } from './services/handlers/on-payment-succeeded-wallet.handler';
import { CqrsModule } from '@nestjs/cqrs';

/**
 * PaymentModule handles payment-related operations.
 *
 * Imports:
 * - PrismaModule: For database access
 * - CqrsModule: For event-driven architecture
 * - WalletModule: For wallet balance management
 *
 * Provides:
 * - PaymentService: Core payment processing logic
 * - PaymentProviderService: Payment gateway integration
 * - WebhookIdempotencyService: Idempotency guard for webhook processing
 * - OnPaymentSucceededWalletHandler: Event handler for wallet credits on subscription payment
 */
@Module({
  imports: [CqrsModule, PrismaModule, forwardRef(() => WalletModule)],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentProviderService,
    WebhookIdempotencyService,
    OnPaymentSucceededWalletHandler,
  ],
  exports: [PaymentService, PaymentProviderService, WebhookIdempotencyService],
})
export class PaymentModule {}
