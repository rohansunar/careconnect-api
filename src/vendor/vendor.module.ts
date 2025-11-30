import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { OtpModule } from '../otp/otp.module';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { VendorAuthController } from './controllers/vendor-auth.controller';
import { VendorAuthService } from './services/vendor-auth.service';
import { VendorProductsController } from './controllers/vendor-products.controller';
import { VendorProductImagesController } from './controllers/vendor-product-images.controller';
import { VendorProductsService } from './services/vendor-products.service';
import { ProductImageService } from './services/products-image.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { S3Service } from '../common/services/s3.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_VENDOR_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    OtpModule,
  ],
  controllers: [
    VendorController,
    VendorAuthController,
    VendorProductsController,
    VendorProductImagesController,
  ],
  providers: [
    VendorService,
    VendorAuthService,
    VendorProductsService,
    ProductImageService,
    JwtStrategy,
    ImageProcessingService,
    S3Service,
  ],
  exports: [VendorService, JwtStrategy],
})
export class VendorModule {}
