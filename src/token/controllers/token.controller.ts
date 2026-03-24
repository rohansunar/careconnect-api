import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import {
  TokenService,
  SendNotificationResult,
} from '../services/token.service';
import { RegisterTokenDto } from '../dto/register-token.dto';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Device Tokens')
@Controller('tokens')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  /**
   * Register a new device token for push notifications
   */
  @Post('register')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register device token',
    description: 'Register or update a device token for push notifications',
  })
  @ApiResponse({
    status: 201,
    description: 'Token registered successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Token revoked' })
  async registerToken(
    @Body() dto: RegisterTokenDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.tokenService.registerToken(
      user.id,
      user.role.toUpperCase(),
      dto,
    );
  }

  /**
   * Refresh token last_used_at timestamp
   */
  @Put('refresh')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh device token',
    description: 'Update the last_used_at timestamp for a device token',
  })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 400, description: 'Token not found' })
  async refreshToken(
    @Query('deviceId') deviceId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.tokenService.refreshToken(
      user.id,
      user.role.toUpperCase(),
      deviceId,
    );
  }

  /**
   * Revoke a device token
   */
  @Delete('revoke')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke device token',
    description: 'Deactivate a device token (soft delete)',
  })
  @ApiResponse({ status: 200, description: 'Token revoked' })
  @ApiResponse({ status: 400, description: 'Token not found' })
  async revokeToken(
    @Query('deviceId') deviceId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.tokenService.revokeToken(
      user.id,
      user.role.toUpperCase(),
      deviceId,
    );
  }

  /**
   * Send push notification to the logged-in user's device(s)
   *
   * This endpoint retrieves all active device tokens for the authenticated user
   * (customer, vendor, or rider) and sends a push notification to each registered device.
   *
   * The user is identified by the JWT token in the Authorization header.
   */
  @Post('notify')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send push notification to user devices',
    description:
      'Sends a push notification to all active devices of the logged-in user. ' +
      'Supports customers, vendors, and riders. The notification is delivered via FCM/APNs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification sent successfully',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiNotFoundResponse({
    description: 'No active devices found for the user',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to send notifications to all devices',
  })
  async sendNotification(
    @Body() dto: SendNotificationDto,
    @CurrentUser() user: { id: string; role: string },
  ): Promise<SendNotificationResult> {
    return this.tokenService.sendNotification(
      user.id,
      user.role.toUpperCase(),
      dto,
    );
  }
}
