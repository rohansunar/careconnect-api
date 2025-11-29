import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { VendorAuthService } from '../services/vendor-auth.service';
import { RequestOtpDto, OtpResponseDto } from '../dto/request-otp.dto';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../dto/verify-otp.dto';

@ApiTags('Vendor Authentication')
@Controller('vendors/auth')
export class VendorAuthController {
  constructor(private readonly vendorAuthService: VendorAuthService) {}

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP for vendor login',
    description:
      'Generate and send OTP to vendor phone number for authentication',
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
    description: 'Vendor not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Vendor not found' },
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
    return this.vendorAuthService.requestOtp(dto.phone);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and authenticate vendor',
    description: 'Verify the OTP code and authenticate the vendor if valid',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully, vendor authenticated',
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
    description: 'Invalid OTP or vendor not found',
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
    return this.vendorAuthService.verifyOtpAndCreateVendor(dto);
  }
}
