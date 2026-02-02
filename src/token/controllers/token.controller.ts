import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TokenService } from '../services/token.service';
import { RegisterTokenDto } from '../dto/register-token.dto';
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
    return this.tokenService.registerToken(user.id, user.role.toUpperCase(), dto);
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
    return this.tokenService.refreshToken(user.id, user.role.toUpperCase(), deviceId);
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
    return this.tokenService.revokeToken(user.id, user.role.toUpperCase(), deviceId);
  }
}
