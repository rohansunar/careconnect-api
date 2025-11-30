import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminVendorGuard extends AuthGuard(['admin-jwt', 'vendor-jwt']) {
  // keep default canActivate (delegates to passport)
  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) {
      throw new UnauthorizedException(err?.message || 'Authentication error');
    }
    if (!user) {
      throw new UnauthorizedException(
        info?.message || 'Authentication required',
      );
    }
    return user; // passport will set req.user
  }
}
