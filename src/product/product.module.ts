import { Module } from '@nestjs/common';
import { CategoriesController } from './controllers/categories.controller';
import { CategoriesService } from './services/categories.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { S3Service } from '../common/services/s3.service';

@Module({
  imports: [],
  controllers: [CategoriesController],
  providers: [CategoriesService, ImageProcessingService, S3Service],
  exports: [],
})
export class ProductModule {}
