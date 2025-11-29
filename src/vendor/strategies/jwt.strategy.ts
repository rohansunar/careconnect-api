import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_VENDOR_SECRET || 'vendor-jwt-secret-key',
    });
  }

  async validate(payload: any) {
    // Business logic rationale: Ensure only vendors with 'vendor' role can access these endpoints.
    // Security consideration: Validate JWT claims to prevent unauthorized access.
    // Design decision: Extract vendor_id from JWT payload for ownership checks.
    if (payload.role !== 'vendor' || !payload.sub) {
      throw new UnauthorizedException('Invalid token for vendor access');
    }
    return { vendorId: payload.sub, role: payload.role };
  }
}
