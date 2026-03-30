import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UserAuthService } from '../services/user-auth.service';
import { RequestOtpDto, OtpResponseDto } from '../dtos/request-otp.dto';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../dtos/verify-otp.dto';
import { Public } from '../decorators/public.decorator';

/**
 * UserAuthController handles authentication endpoints for users.
 *
 * Design Rationale:
 * - Separate controllers for modularity: Maintaining distinct controllers for vendors and users
 *   ensures modularity, allowing each to evolve independently while adhering to single responsibility principle.
 *   This separation facilitates easier testing, maintenance, and scaling of authentication logic for different user types.
 * - OTP for security: One-Time Password (OTP) authentication provides enhanced security by eliminating
 *   the risks associated with static passwords, such as credential theft or brute-force attacks.
 *   It enables secure, passwordless login suitable for mobile-first applications.
 * - Mirroring for consistency: Replicating the structure and patterns from the vendor authentication controller
 *   promotes code consistency across the application, reduces cognitive load for developers, and simplifies
 *   maintenance by establishing predictable patterns for similar functionality.
 */
@ApiTags('Auth')
@Controller('auth/user')
export class UserAuthController {
  constructor(private readonly userAuthService: UserAuthService) {}

  @Public()
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP for user login',
    description:
      'Generate and send OTP to user phone number for authentication',
  })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: OtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid phone number or rate limit exceeded',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Too many OTP requests. Please try again later.',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account inactive',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Account is inactive' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.userAuthService.requestOtp(dto.phone);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and authenticate user',
    description: 'Verify the OTP code and authenticate the user if valid',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully, user authenticated',
    type: VerifyOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid OTP format',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'OTP must be exactly 6 digits' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid OTP or user not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid OTP' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.userAuthService.verifyOtpAndCreateUser(dto);
  }
}
