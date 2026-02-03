import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtTokenService } from './jwt-token.service';

/**
 * AdminAuthService handles authentication for admin users using email and password.
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  // Token expiration time in seconds (10 hours)
  private readonly ADMIN_JWT_EXPIRES_IN = 36000;

  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Authenticates an admin user by verifying email and password, then generates a JWT token.
   * @param email - The admin's email address.
   * @param password - The plain text password to verify.
   * @returns An object containing the JWT token, admin details, and expiration time.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{
    token: string;
    admin: any;
    expiresIn: number;
  }> {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { email },
      });

      if (!admin) {
        throw new BadRequestException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        admin.password_hash,
      );

      if (!isPasswordValid) {
        throw new BadRequestException('Invalid credentials');
      }

      // Generate JWT token with admin information
      const payload = {
        sub: admin.id,
        email: admin.email,
      };

      const token = this.jwtTokenService.generateToken(payload, 'admin');

      const { password_hash, updated_at, ...sanitizedAdmin } = admin;

      return {
        token,
        admin: sanitizedAdmin,
        expiresIn: this.ADMIN_JWT_EXPIRES_IN,
      };
    } catch (error) {
      this.logger.error('Error in admin login:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Login failed. Please try again.');
    }
  }
}
