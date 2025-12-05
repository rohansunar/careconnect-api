import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(
  Strategy,
  'vendor-jwt',
) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('CUSTOMER_JWT_SECRET') || 'customer-jwt-secret-key',
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    // Business logic rationale: Ensure only vendors with 'vendor' role can access these endpoints.
    // Security consideration: Validate JWT claims to prevent unauthorized access.
    // Design decision: Extract vendor_id from JWT payload for ownership checks.
    if (payload.role !== 'customer' || !payload.sub) {
      throw new UnauthorizedException('Invalid token for vendor access');
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
