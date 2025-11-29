import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

const cookieExtractor = (req: any) => {
  if (!req || !req.headers) return null;
  // cookie-parser populates req.cookies
  if (req.cookies && req.cookies['refresh_token']) {
    return req.cookies['refresh_token'];
  }
  // fallback to body field refreshToken
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }
  // fallback to Authorization header Bearer <token> if used
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: cookieExtractor as any,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'REFRESH_SECRET',
      passReqToCallback: true,
    });
  }

  // validate gets the payload and request
  async validate(req: any, payload: any) {
    // return payload (we will further verify against DB in service)
    return { id: payload.sub, email: payload.email };
  }
}
