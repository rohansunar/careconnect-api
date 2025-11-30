import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class VendorAuthGuard extends AuthGuard('vendor-jwt') {
  // // Optionally override canActivate to support @Public() or other behavior.
  // canActivate(context: ExecutionContext) {
  //   return super.canActivate(context) as boolean | Promise<boolean>;
  // }

  // // Normalize Passport results into Nest exceptions
  // handleRequest(err: any, user: any, info: any) {
  //   if (err) {
  //     const msg = err?.message || 'Authentication error';
  //     throw new UnauthorizedException(msg);
  //   }
  //   if (!user) {
  //     const msg = info?.message || 'Vendor authentication required';
  //     throw new UnauthorizedException(msg);
  //   }
  //   // user will be attached to request by Passport
  //   return user;
  // }
}
