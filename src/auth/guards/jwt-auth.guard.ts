import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JwtAuthGuard is the unified authentication guard that uses the single JWT strategy.
 *
 * Design Rationale:
 * - Single guard for all user types, eliminating code duplication
 * - Uses the unified JWT strategy that validates tokens from any user type
 * - Authentication is separated from authorization (role checking)
 * - Maintains backward compatibility with existing guard usage patterns
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }
  /**
   * Handles authentication errors and provides consistent error messages.
   */
  handleRequest<TUser = Record<string, unknown>>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (err) {
      throw new UnauthorizedException(
        err instanceof Error ? err.message : 'Authentication error',
      );
    }
    if (!user) {
      throw new UnauthorizedException(
        info instanceof Error ? info.message : 'Authentication required',
      );
    }
    return user;
  }
}
