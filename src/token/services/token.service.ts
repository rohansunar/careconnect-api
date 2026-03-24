import {
  Injectable,
  BadRequestException,
  Logger,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { RegisterTokenDto } from '../dto/register-token.dto';
import { SendNotificationDto } from '../dto/send-notification.dto';
import {
  PushChannelService,
  PushNotificationPayload,
} from '../../notification/services/channels/push-channel.service';

/**
 * TokenService handles device token registration and management for push notifications.
 *
 * Design Rationale:
 * - Single responsibility: Manages device token lifecycle (register, refresh, revoke)
 * - Multi-device support: Users can have multiple devices registered
 * - Soft delete: Tokens are deactivated rather than deleted for audit trail
 */
/**
 * Result of sending notification to user devices
 */
export interface SendNotificationResult {
  success: boolean;
  totalDevices: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  errors: string[];
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushChannelService: PushChannelService,
  ) {}

  /**
   * Register a new device token or update existing one
   *
   * @param userId - The user ID from JWT
   * @param userType - The user type (CUSTOMER, RIDER, VENDOR)
   * @param dto - Token registration data
   * @returns The registered token record
   */
  async registerToken(userId: string, userType: string, dto: RegisterTokenDto) {
    this.logger.log(`Registering token for (${userType})`);

    // Check if token already exists for this device
    const existingToken = await this.prisma.deviceToken.findUnique({
      where: {
        user_id_device_id: {
          user_id: userId,
          device_id: dto.deviceId,
        },
      },
    });

    if (existingToken) {
      // Update existing token (token refresh from FCM/APNs)
      if (!existingToken.is_active) {
        throw new ConflictException('Device token has been revoked');
      }

      const updated = await this.prisma.deviceToken.update({
        where: { id: existingToken.id },
        data: {
          device_token: dto.deviceToken,
          device_type: dto.deviceType,
          device_name: dto.deviceName,
          last_used_at: new Date(),
          updated_at: new Date(),
        },
      });

      this.logger.log(`Token updated for device ${dto.deviceId}`);
      return updated;
    }

    // Create new token record
    const token = await this.prisma.deviceToken.create({
      data: {
        user_id: userId,
        user_type: userType,
        device_token: dto.deviceToken,
        device_id: dto.deviceId,
        device_type: dto.deviceType,
        device_name: dto.deviceName,
      },
    });

    this.logger.log(
      `New token created for user ${userId}, device ${dto.deviceId}`,
    );
    return token;
  }

  /**
   * Refresh token last_used_at timestamp
   *
   * @param userId - The user ID from JWT
   * @param userType - The user type
   * @param deviceId - The device ID to refresh
   */
  async refreshToken(userId: string, userType: string, deviceId: string) {
    const token = await this.prisma.deviceToken.findUnique({
      where: {
        user_id_device_id: {
          user_id: userId,
          device_id: deviceId,
        },
      },
    });

    if (!token || !token.is_active) {
      throw new BadRequestException('Device token not found or inactive');
    }

    return await this.prisma.deviceToken.update({
      where: { id: token.id },
      data: {
        last_used_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  /**
   * Revoke a device token (soft delete)
   *
   * @param userId - The user ID from JWT
   * @param userType - The user type
   * @param deviceId - The device ID to revoke
   */
  async revokeToken(userId: string, userType: string, deviceId: string) {
    const token = await this.prisma.deviceToken.findUnique({
      where: {
        user_id_device_id: {
          user_id: userId,
          device_id: deviceId,
        },
      },
    });

    if (!token) {
      throw new BadRequestException('Device token not found');
    }

    if (!token.is_active) {
      return { message: 'Token already revoked' };
    }

    await this.prisma.deviceToken.update({
      where: { id: token.id },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Token revoked for user ${userId}, device ${deviceId}`);
    return { message: 'Token revoked successfully' };
  }

  /**
   * Get all active tokens for a user
   *
   * @param userId - The user ID
   * @param userType - The user type
   * @returns Array of active device tokens
   */
  async getUserTokens(userId: string, userType: string) {
    return await this.prisma.deviceToken.findMany({
      where: {
        user_id: userId,
        user_type: userType,
        is_active: true,
      },
      orderBy: {
        last_used_at: 'desc',
      },
    });
  }

  /**
   * Get active device tokens for a user (for push notifications)
   *
   * @param userId - The user ID
   * @param userType - The user type
   * @returns Array of device token strings
   */
  async getActiveTokens(userId: string, userType: string): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        user_id: userId,
        user_type: userType,
        is_active: true,
      },
      select: {
        device_token: true,
      },
    });

    return tokens.map((t: { device_token: string }) => t.device_token);
  }

  /**
   * Send push notification to all active devices of the logged-in user
   *
   * This method retrieves all active device tokens for the user and sends
   * a push notification to each device via FCM/APNs.
   *
   * @param userId - The user ID from JWT
   * @param userType - The user type (CUSTOMER, RIDER, VENDOR)
   * @param dto - Notification data (title, body, data, imageUrl)
   * @returns Result of the notification sending operation
   */
  async sendNotification(
    userId: string,
    userType: string,
    dto: SendNotificationDto,
  ): Promise<SendNotificationResult> {
    this.logger.log(`Sending notification to user ${userId} (${userType})`);

    // Get all active device tokens for the user
    const activeTokens = await this.getActiveTokens(userId, userType);

    if (activeTokens.length === 0) {
      this.logger.warn(`No active devices found for user ${userId}`);
      throw new NotFoundException(
        'No active devices found. Please register a device token first.',
      );
    }

    this.logger.log(
      `Found ${activeTokens.length} active device(s) for user ${userId}`,
    );

    // Build the notification payload
    const payload: PushNotificationPayload = {
      title: dto.title,
      body: dto.body,
      data: dto.data,
    };

    // Send notification to all devices
    const correlationId = this.pushChannelService.generateCorrelationId();
    let successfulDeliveries = 0;
    let failedDeliveries = 0;
    const errors: string[] = [];

    // Send to each device
    const sendPromises = activeTokens.map(async (token) => {
      try {
        const result = await this.pushChannelService.send(
          token,
          payload,
          correlationId,
        );

        if (result.success) {
          successfulDeliveries++;
        } else {
          failedDeliveries++;
          if (result.error) {
            errors.push(`Device ${token.substring(0, 10)}...: ${result.error}`);
          }
        }
      } catch (error) {
        failedDeliveries++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Device ${token.substring(0, 10)}...: ${errorMessage}`);
        this.logger.error(
          `Failed to send notification to device: ${errorMessage}`,
          { correlationId },
        );
      }
    });

    // Wait for all notifications to be sent
    await Promise.all(sendPromises);

    const success = successfulDeliveries > 0;

    this.logger.log(
      `Notification sent to user ${userId}: ${successfulDeliveries} successful, ${failedDeliveries} failed`,
      { correlationId },
    );

    // If all deliveries failed, throw an error
    if (!success && errors.length > 0) {
      throw new InternalServerErrorException(
        `Failed to send notifications to all devices: ${errors.join('; ')}`,
      );
    }

    return {
      success,
      totalDevices: activeTokens.length,
      successfulDeliveries,
      failedDeliveries,
      errors,
    };
  }
}
