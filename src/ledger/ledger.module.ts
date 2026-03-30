import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { CqrsModule } from '@nestjs/cqrs';
import { VendorLedgerController } from './controllers/vendor-ledger.controller';
import { VendorLedgerService } from './services/vendor-ledger.service';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [VendorLedgerController],
  providers: [VendorLedgerService],
  exports: [VendorLedgerService],
})
export class LedgerModule {}
