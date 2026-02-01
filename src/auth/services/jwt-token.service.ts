import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JwtTokenService provides centralized JWT token generation for all user types.
 *
 * Design Rationale:
 * - Single source of truth for token generation across all authentication services
 * - Consistent token payload structure for all user types
 * - Configurable expiration times per user type
 * - Eliminates duplicate JWT secret handling and signOptions configuration
 */
@Injectable()
export class JwtTokenService {
  /**
   * Default token expiration in seconds (10 hours)
   */
  private readonly defaultExpiresIn = 36000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generates a JWT token for the specified user.
   *
   * @param payload - The token payload containing user information
   * @param role - The role of the user (admin, vendor, customer, rider)
   * @returns The signed JWT token
   */
  generateToken(payload: Record<string, unknown>, role: string): string {
    const tokenPayload: Record<string, unknown> = {
      ...payload,
      role,
    };

    return this.jwtService.sign(tokenPayload, {
      secret: this.config.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Generates a token with a specific expiration time.
   *
   * @param userId - The unique identifier of the user
   * @param role - The role of the user
   * @param expiresIn - Expiration time in seconds
   * @param additionalClaims - Optional additional claims
   * @returns The signed JWT token
   */
  generateTokenWithExpiration(
    userId: string | number,
    role: string,
    expiresIn: number,
    additionalClaims: Record<string, unknown> = {},
  ): string {
    const payload: Record<string, unknown> = {
      sub: userId.toString(),
      role,
      ...additionalClaims,
    };

    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn,
    });
  }

  /**
   * Returns the default expiration time for tokens.
   *
   * @returns Expiration time in seconds
   */
  getDefaultExpiresIn(): number {
    return this.defaultExpiresIn;
  }
}
