import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { LocationController } from './controllers/location.controller';
import { LocationService } from './services/location.service';

@Module({
  imports: [PrismaModule],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
