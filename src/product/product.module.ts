import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { ProductImageController } from './controllers/product-image.controller';
import { ProductService } from './services/product.service';
import { AdminVendorGuard } from './guards/admin-vendor.guard';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { S3Service } from '../common/services/s3.service';
import { ProductImageService } from '../product/services/products-image.service';

@Module({
  imports: [],
  controllers: [ProductController, ProductImageController],
  providers: [
    ProductService,
    AdminVendorGuard,
    ImageProcessingService,
    S3Service,ProductImageService
  ],
  exports: [
    ProductService,
    AdminVendorGuard,
  ],
})
export class ProductModule {}
