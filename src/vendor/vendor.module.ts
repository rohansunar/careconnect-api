import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { OtpModule } from '../otp/otp.module';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { VendorAuthController } from './controllers/vendor-auth.controller';
import { VendorAuthService } from './services/vendor-auth.service';
import { VendorProductsController } from './controllers/vendor-products.controller';
import { VendorProductsService } from './services/vendor-products.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

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
  ],
  providers: [
    VendorService,
    VendorAuthService,
    VendorProductsService,
    JwtStrategy,
  ],
  exports: [VendorService, JwtStrategy],
})
export class VendorModule {}
