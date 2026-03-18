import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { WalletService } from './services/wallet.service';
import { WalletPaymentService } from './services/wallet-payment.service';
import { WalletPaymentController } from './controllers/wallet-payment.controller';

/**
 * Wallet module for customer wallet operations
 * Provides wallet balance management, credits, and debits
 * Also handles payment initialization for wallet top-ups
 */
@Module({
  imports: [PrismaModule, forwardRef(() => PaymentModule)],
  controllers: [WalletPaymentController],
  providers: [WalletService, WalletPaymentService],
  exports: [WalletService, WalletPaymentService],
})
export class WalletModule {}
