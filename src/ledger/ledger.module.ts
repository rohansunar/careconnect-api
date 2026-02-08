import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { CqrsModule } from '@nestjs/cqrs';
import { OnPaymentSucceededLedgerHandler } from './services/handlers/on-payment-succeeded-ledger.handler';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [],
  providers: [OnPaymentSucceededLedgerHandler],
  exports: [],
})
export class LedgerModule {}
