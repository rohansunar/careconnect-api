import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('ADMIN_JWT_SECRET') || 'JWT_ADMIN_SECRET',
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    // return minimal user for req.user; mark role explicitly
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
