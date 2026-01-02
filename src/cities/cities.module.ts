import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { CitiesController } from './controllers/cities.controller';
import { CitiesService } from './services/cities.service';

@Module({
  imports: [PrismaModule],
  controllers: [CitiesController],
  providers: [CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}