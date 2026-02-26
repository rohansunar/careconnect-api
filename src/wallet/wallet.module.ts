import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { WalletService } from './services/wallet.service';

/**
 * Wallet module for customer wallet operations
 * Provides wallet balance management, credits, and debits
 */
@Module({
  imports: [PrismaModule],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
