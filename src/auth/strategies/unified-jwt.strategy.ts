import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * UnifiedJwtStrategy handles JWT validation for all user types using a single secret key.
 *
 * Design Rationale:
 * - Single strategy eliminates code duplication across multiple user-type-specific strategies
 * - Uses the same JWT_SECRET for all user types, ensuring consistent security
 * - Validates token structure and expiration without role-specific checks
 * - Role validation is delegated to RolesGuard for centralized authorization
 */
@Injectable()
export class UnifiedJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_SECRET') || 'your-unified-jwt-secret-key',
      passReqToCallback: false,
    });
  }

  /**
   * Validates the JWT payload and returns user information.
   * The actual role validation is handled by RolesGuard to centralize authorization logic.
   *
   * @param payload - The decoded JWT payload
   * @returns Object containing user id, email/phone, and role
   * @throws UnauthorizedException if token is invalid or missing required claims
   */
  async validate(payload: Record<string, unknown>): Promise<{
    id: string;
    email?: string;
    phone?: string;
    role: string;
  }> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing subject claim');
    }

    return {
      id: payload.sub as string,
      email: payload.email as string | undefined,
      phone: payload.phone as string | undefined,
      role: (payload.role as string) || 'unknown',
    };
  }
}
