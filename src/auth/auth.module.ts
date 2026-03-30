import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/database/prisma.service';
import { OtpModule } from '../otp/otp.module';
import { RolesGuard } from './guards/roles.guard';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminAuthService } from './services/admin-auth.service';
import { UserAuthController } from './controllers/user-auth.controller';
import { UserAuthService } from './services/user-auth.service';
import { UnifiedJwtStrategy } from './strategies/unified-jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtTokenService } from './services/jwt-token.service';

/**
 * AuthModule provides unified JWT authentication for all user types.
 *
 * Architecture:
 * - Single UnifiedJwtStrategy for all user types (vendor, user, rider, admin)
 * - Single JwtAuthGuard for authentication
 * - Single RolesGuard for authorization
 * - Role-based access control using @Roles decorator
 */
@Module({
  imports: [
    ConfigModule,
    OtpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET') || 'your-unified-jwt-secret-key',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [
    AdminAuthService,
    UserAuthService,
    PrismaService,
    UnifiedJwtStrategy,
    JwtAuthGuard,
    JwtTokenService,
    RolesGuard,
  ],
  controllers: [AdminAuthController, UserAuthController],
  exports: [JwtAuthGuard, RolesGuard, JwtTokenService],
})
export class AuthModule {}
