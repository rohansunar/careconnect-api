import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminLoginDto } from '../dtos/admin-login.dto';

/**
 * AdminAuthController handles authentication endpoints for admin users.
 *
 * Design Rationale:
 * - Separate controller for modularity and scalability: Creating a dedicated controller for admin authentication
 *   ensures modularity by isolating admin-specific logic from customer and vendor authentication. This separation
 *   adheres to the single responsibility principle, allowing independent evolution, testing, and scaling of admin auth
 *   functionality without affecting other parts of the system.
 * - Email and password authentication: Unlike OTP-based systems used for customers, admins use traditional email/password
 *   login for simplicity and familiarity, suitable for backend management interfaces where security is balanced with usability.
 * - Framework-agnostic core logic: The controller delegates authentication logic to the service layer, keeping the controller
 *   thin and focused on HTTP handling, promoting reusability and testability.
 * - Swagger documentation: Comprehensive API documentation ensures clarity for frontend developers and API consumers,
 *   reducing integration errors and improving maintainability.
 */
@ApiTags('Auth')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login',
    description:
      'Authenticate admin user with email and password, returning a JWT token',
  })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token and admin details',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        admin: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'admin-uuid' },
            email: { type: 'string', example: 'admin@example.com' },
          },
        },
        expiresIn: { type: 'number', example: 36000 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto.email, dto.password);
  }
}
