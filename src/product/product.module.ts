import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';
import { AdminVendorGuard } from './guards/admin-vendor.guard';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { S3Service } from '../common/services/s3.service';

@Module({
  imports: [],
  controllers: [ProductController],
  providers: [
    ProductService,
    AdminVendorGuard,
    ImageProcessingService,
    S3Service,
  ],
  exports: [
    ProductService,
    AdminVendorGuard,
  ],
})
export class ProductModule {}
