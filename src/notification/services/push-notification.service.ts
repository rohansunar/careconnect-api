import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * PushNotificationService handles sending push notifications via FCM
 *
 * Design Rationale:
 * - Separate service for push notifications to maintain single responsibility
 * - Batch sending support for FCM's 500 token limit
 * - Automatic token invalidation handling
 */
@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly fcmApiUrl = 'https://fcm.googleapis.com/fcm/send';
  private readonly fcmServerKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY') || '';
  }

  /**
   * Send push notification to all devices of a user
   *
   * @param userId - The user ID
   * @param userType - The user type (CUSTOMER, RIDER, VENDOR)
   * @param payload - Notification payload
   * @returns Number of successful sends
   */
  async sendToUser(
    userId: string,
    userType: string,
    payload: NotificationPayload,
  ): Promise<number> {
    const tokens = await this.getActiveTokens(userId, userType);
    if (tokens.length === 0) {
      this.logger.warn(`No active tokens found for user ${userId}`);
      return 0;
    }

    return await this.sendToTokens(tokens, payload);
  }

  /**
   * Send push notification to multiple users
   *
   * @param userIds - Array of user IDs
   * @param userType - The user type
   * @param payload - Notification payload
   * @returns Number of successful sends
   */
  async sendToUsers(
    userIds: string[],
    userType: string,
    payload: NotificationPayload,
  ): Promise<number> {
    const tokens = await this.getActiveTokensForUsers(userIds, userType);
    return await this.sendToTokens(tokens, payload);
  }

  /**
   * Send push notification to a specific device
   *
   * @param deviceToken - The device FCM token
   * @param payload - Notification payload
   * @returns Success status
   */
  async sendToDevice(
    deviceToken: string,
    payload: NotificationPayload,
  ): Promise<boolean> {
    try {
      await this.sendToFCM([deviceToken], payload);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send to device: ${error.message}`);
      return false;
    }
  }

  /**
   * Get active device tokens for a user
   */
  private async getActiveTokens(
    userId: string,
    userType: string,
  ): Promise<string[]> {
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

    return tokens.map((t) => t.device_token);
  }

  /**
   * Get active tokens for multiple users
   */
  private async getActiveTokensForUsers(
    userIds: string[],
    userType: string,
  ): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        user_id: { in: userIds },
        user_type: userType,
        is_active: true,
      },
      select: {
        device_token: true,
      },
    });

    return tokens.map((t) => t.device_token);
  }

  /**
   * Send notifications to multiple tokens in batches
   */
  private async sendToTokens(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<number> {
    let successCount = 0;
    const batchSize = 500; // FCM limit

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const results = await this.sendToFCM(batch, payload);

      // Deactivate invalid tokens
      const invalidTokens = await this.identifyInvalidTokens(batch, results);
      if (invalidTokens.length > 0) {
        await this.deactivateTokens(invalidTokens);
      }

      successCount += results.filter((r) => r.success).length;
    }

    return successCount;
  }

  /**
   * Send to FCM API
   */
  private async sendToFCM(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<{ success: boolean; token: string }[]> {
    // Note: In production, use firebase-admin SDK
    // This is a simplified implementation
    const results: { success: boolean; token: string }[] = [];

    for (const token of tokens) {
      try {
        // Simulated FCM send - replace with actual FCM implementation
        this.logger.debug(`Sending notification to token: ${token.substring(0, 10)}...`);

        // In production, use:
        // await admin.messaging().sendToDevice(token, payload);

        results.push({ success: true, token });
      } catch (error) {
        this.logger.error(`FCM send failed for token: ${error.message}`);
        results.push({ success: false, token });
      }
    }

    return results;
  }

  /**
   * Identify tokens that failed permanently (invalid)
   */
  private async identifyInvalidTokens(
    tokens: string[],
    results: { success: boolean; token: string }[],
  ): Promise<string[]> {
    return results
      .filter((r) => !r.success)
      .map((r) => r.token);
  }

  /**
   * Deactivate invalid tokens
   */
  private async deactivateTokens(tokens: string[]): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: {
        device_token: { in: tokens },
      },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Deactivated ${tokens.length} invalid tokens`);
  }
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sound?: string;
  badge?: number;
}
