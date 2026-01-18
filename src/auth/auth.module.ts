import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VendorJwtStrategy } from './strategies/vendor-jwt.strategy';
import { VendorAuthGuard } from './guards/vendor-auth.guard';
import { VendorAuthService } from './services/vendor-auth.service';
import { PrismaService } from '../common/database/prisma.service';
import { OtpModule } from '../otp/otp.module';
import { VendorAuthController } from './controllers/vendor-auth.controller';
import { AdminVendorGuard } from './guards/admin-vendor.guard';
import { CustomerAuthGuard } from './guards/customer-auth.guard';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminAuthService } from './services/admin-auth.service';
import { CustomerAuthController } from './controllers/customer-auth.controller';
import { CustomerAuthService } from './services/customer-auth.service';

@Module({
  imports: [
    ConfigModule, // ensure ConfigService is available
    OtpModule,
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
    CustomerAuthService,
    PrismaService,
    AdminJwtStrategy,
    VendorAuthGuard,
    VendorJwtStrategy,
    AdminVendorGuard,
    CustomerAuthGuard,
    CustomerJwtStrategy,
    RolesGuard,
  ],
  controllers: [
    VendorAuthController,
    AdminAuthController,
    CustomerAuthController,
  ],
  exports: [VendorAuthGuard, AdminVendorGuard, CustomerAuthGuard, RolesGuard],
})
export class AuthModule {}
