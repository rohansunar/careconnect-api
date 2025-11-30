import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { ProductImageController } from './controllers/product-image.controller';
import { ProductService } from './services/product.service';
import { AdminVendorJwtStrategy } from './strategies/vendor-admin.strategy';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { S3Service } from '../common/services/s3.service';
import { ProductImageService } from '../product/services/products-image.service';

@Module({
  imports: [],
  controllers: [ProductController, ProductImageController],
  providers: [
    ProductService,
    AdminVendorJwtStrategy,
    ImageProcessingService,
    S3Service,ProductImageService
  ],
  exports: [
    ProductService,
    AdminVendorJwtStrategy,
  ],
})
export class ProductModule {}
