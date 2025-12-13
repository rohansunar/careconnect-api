import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { ProductImageController } from './controllers/product-image.controller';
import { CategoriesController } from './controllers/categories.controller';
import { ProductService } from './services/product.service';
import { CategoriesService } from './services/categories.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { S3Service } from '../common/services/s3.service';
import { ProductImageService } from './services/products-image.service';

@Module({
  imports: [],
  controllers: [ProductController, ProductImageController, CategoriesController],
  providers: [
    ProductService,
    CategoriesService,
    ImageProcessingService,
    S3Service,
    ProductImageService,
  ],
  exports: [ProductService],
})
export class ProductModule {}
