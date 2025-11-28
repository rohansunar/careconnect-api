import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { OtpModule } from '../otp/otp.module';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { VendorAuthController } from './controllers/vendor-auth.controller';
import { VendorAuthService } from './services/vendor-auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [PrismaModule, OtpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_VENDOR_SECRET') ||
          'vendor-jwt-secret-key',
        signOptions: {
          expiresIn: '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [VendorController, VendorAuthController],
  providers: [VendorService, VendorAuthService],
  exports: [VendorService],
})
export class VendorModule {}
