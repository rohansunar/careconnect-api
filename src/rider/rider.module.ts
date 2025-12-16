import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { RiderController } from './controllers/rider.controller';
import { RiderService } from './services/rider.service';

@Module({
  imports: [PrismaModule],
  controllers: [RiderController],
  providers: [RiderService],
  exports: [RiderService],
})
export class RiderModule {}