import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/database/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * AdminAuthService handles authentication for admin users using email and password.
 *
 * Design Rationale:
 * - Separate files for scalability and modularity: By creating a dedicated service file for admin authentication,
 *   we maintain clear separation of concerns, allowing independent development, testing, and scaling of admin-specific
 *   auth logic without impacting customer or vendor authentication.
 * - Avoiding coupling with other auth logic: This service focuses solely on admin login, preventing tight coupling
 *   with OTP-based or other authentication mechanisms used elsewhere, promoting reusability and easier maintenance.
 * - Dependency injection for testability: Injecting PrismaService and JwtService enables easy mocking in unit tests
 *   and adheres to SOLID principles by depending on abstractions rather than concrete implementations.
 * - Short methods and descriptive names: Each method performs a single responsibility, making the code readable
 *   and maintainable for future developers or AI maintainers.
 */
@Injectable()
export class AdminAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Authenticates an admin user by verifying email and password, then generates a JWT token.
   * @param email - The admin's email address.
   * @param password - The plain text password to verify.
   * @returns An object containing the JWT token, admin details, and expiration time.
   * @throws BadRequestException if credentials are invalid.
   * @throws UnauthorizedException for other authentication failures.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{
    token: string;
    admin: any;
    expiresIn: number;
  }> {
    // Query the database for the admin user by email
    const admin = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new BadRequestException('Invalid credentials');
    }

    // Verify the provided password against the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    // Generate JWT token with admin information
    const payload = {
      sub: admin.id,
      email: admin.email,
      role: 'admin',
    };

    const token = this.jwtService.sign(payload);
    const expiresIn = 36000; // 10 hours

    const { password_hash,updated_at, ...sanitizedAdmin } = admin;

    return {
      token,
      admin: sanitizedAdmin,
      expiresIn,
    };
  }
}
