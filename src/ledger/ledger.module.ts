import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { CqrsModule } from '@nestjs/cqrs';
import { OnOrderDeliveredLedgerHandler } from './services/handlers/on-order-delivered-ledger.handler';
import { VendorLedgerController } from './controllers/vendor-ledger.controller';
import { VendorLedgerService } from './services/vendor-ledger.service';

// Event handlers to register
const EventHandlers = [OnOrderDeliveredLedgerHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [VendorLedgerController],
  providers: [...EventHandlers, VendorLedgerService],
  exports: [VendorLedgerService],
})
export class LedgerModule {}
