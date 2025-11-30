// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { VendorJwtStrategy } from './strategies/vendor-jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VendorAuthService } from './services/vendor-auth.service';
import { PrismaService } from '../common/database/prisma.service';
import { OtpService } from '../otp/services/otp.service';
import { VendorAuthController } from './controllers/vendor-auth.controller';
import { VendorAuthGuard } from './guards/vendor-auth.guard';


@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'vendor-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('VENDOR_JWT_SECRET') || 'vendor-jwt-secret-key',
        signOptions: { expiresIn:  '7d' },
      }),
    }),
    ConfigModule, // ensure ConfigService is available
  ],
  providers: [VendorJwtStrategy, VendorAuthGuard, VendorAuthService, PrismaService, OtpService],
  controllers: [VendorAuthController],
  exports: [VendorAuthGuard],
})
export class AuthModule {}
