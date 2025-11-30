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
import { AdminVendorGuard } from './guards/admin-vendor.guard';
import { RolesGuard } from './guards/roles.guard';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminAuthService } from './services/admin-auth.service';

@Module({
  imports: [
    ConfigModule, // ensure ConfigService is available
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('ADMIN_JWT_SECRET') || 'JWT_ADMIN_SECRET',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [
    VendorAuthService,
    AdminAuthService,
    PrismaService,
    OtpService,
    VendorJwtStrategy,
    VendorAuthGuard,
    AdminJwtStrategy,
    AdminVendorGuard,
    RolesGuard,
  ],
  controllers: [VendorAuthController, AdminAuthController],
  exports: [VendorAuthGuard, AdminVendorGuard, RolesGuard],
})
export class AuthModule {}
