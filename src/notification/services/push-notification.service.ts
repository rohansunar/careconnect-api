import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { NotificationPayload } from '../dto/notification-payload.dto';
import { FcmSendResult } from '../dto/fcm-send-result.dto';
import { UserType } from '../dto/user-type.enum';
import { OrderNotificationPayloadDto } from '../dto/order-notification-payload.dto';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * PushNotificationService handles sending push notifications via Firebase Cloud Messaging
 *
 * Design Rationale:
 * - Separate service for push notifications to maintain single responsibility
 * - Batch sending support for FCM's 500 token limit
 * - Automatic token invalidation handling
 * - Firebase Admin SDK for production-ready FCM integration
 * - Retry logic with exponential backoff for resilience
 */
@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private messaging: admin.messaging.Messaging | null = null;
  private static readonly FCM_BATCH_SIZE = 500;

  /**
   * FCM error codes that are retriable
   * Non-retriable errors: INVALID_ARGUMENT, UNREGISTERED, QUOTA_EXCEEDED
   */
  private static readonly RETRIABLE_ERROR_CODES = [
    'UNAVAILABLE',
    'INTERNAL',
    'TOO_MANY_REQUESTS',
    '503',
    '500',
    '429',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialize Firebase Admin SDK with service account credentials
   * Called automatically by NestJS when the module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK with service account credentials from JSON file
   *
   * @throws Error if credentials file is missing or invalid
   */
  private async initializeFirebase(): Promise<void> {
    try {
      const credentialsPath = path.resolve(
        process.cwd(),
        process.env.FIREBASE_CREDENTIALS_FILE ||
          'firebase-service-account.json',
      );

      // Check if credentials file exists
      if (!fs.existsSync(credentialsPath)) {
        throw new Error(
          `Firebase credentials file not found at: ${credentialsPath}`,
        );
      }

      // Read and parse credentials file
      const credentialsContent = fs.readFileSync(credentialsPath, 'utf-8');
      const serviceAccount = JSON.parse(credentialsContent);

      if (!serviceAccount) {
        throw new Error(
          'Firebase service account credentials are invalid or empty',
        );
      }

      // Initialize Firebase Admin SDK if not already initialized
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log('Firebase Admin SDK initialized successfully');
      }

      this.messaging = admin.messaging();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to initialize Firebase Admin SDK: ${errorMessage}`,
      );
      // Don't throw - allow app to start without FCM
      this.messaging = null;
    }
  }

  /**
   * Send a push notification to a single device token
   *
   * @param deviceToken - The FCM device token
   * @param title - Notification title
   * @param body - Notification body
   * @returns Promise<FcmSendResult> - Result of the send operation
   */
  async sendPushNotification(
    deviceToken: string,
    title: string,
    body: string,
  ): Promise<FcmSendResult> {
    if (!this.messaging) {
      this.logger.error('Firebase messaging not initialized');
      return {
        success: false,
        token: deviceToken,
        error: 'Firebase messaging not initialized',
      };
    }

    if (!deviceToken || deviceToken.trim().length === 0) {
      return {
        success: false,
        token: deviceToken,
        error: 'Device token is empty or invalid',
      };
    }

    const payload: NotificationPayload = {
      title,
      body,
    };

    try {
      const response = await this.messaging.send({
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            sound: payload.sound,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound,
              badge: payload.badge,
            },
          },
        },
      });

      this.logger.log(
        `Push notification sent successfully to device token: ${deviceToken}`,
      );

      return {
        success: true,
        token: deviceToken,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send push notification to ${deviceToken}: ${errorMessage}`,
      );

      return {
        success: false,
        token: deviceToken,
        error: errorMessage,
      };
    }
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
    userType: UserType,
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
    userType: UserType,
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
    if (!this.messaging) {
      this.logger.error('Firebase messaging not initialized');
      return false;
    }

    try {
      const results = await this.sendWithRetry([deviceToken], payload);
      return results.some((r) => r.success);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send to device: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Send notifications to multiple tokens in batches
   *
   * @param tokens - Array of FCM device tokens
   * @param payload - Notification payload
   * @returns Number of successful sends
   */
  private async sendToTokens(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<number> {
    if (!this.messaging) {
      this.logger.error('Firebase messaging not initialized');
      return 0;
    }

    let successCount = 0;

    for (
      let i = 0;
      i < tokens.length;
      i += PushNotificationService.FCM_BATCH_SIZE
    ) {
      const batch = tokens.slice(i, i + PushNotificationService.FCM_BATCH_SIZE);

      try {
        const results = await this.sendWithRetry(batch, payload);

        // Deactivate invalid tokens
        const invalidTokens = await this.identifyInvalidTokens(batch, results);
        if (invalidTokens.length > 0) {
          await this.deactivateTokens(invalidTokens);
        }

        successCount += results.filter((r) => r.success).length;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Batch send failed: ${errorMessage}`);
      }
    }

    return successCount;
  }

  /**
   * Send to Firebase Cloud Messaging using Admin SDK
   *
   * @param tokens - Array of FCM device tokens
   * @param payload - Notification payload
   * @returns Array of send results for each token
   * @throws Error if FCM batch send fails
   */
  private async sendToFCM(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<FcmSendResult[]> {
    if (!this.messaging) {
      throw new Error('Firebase messaging not initialized');
    }

    const results: FcmSendResult[] = [];

    try {
      const response = await this.messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high' as const,
          notification: {
            sound: payload.sound,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound,
              badge: payload.badge,
            },
          },
        },
      });

      response.responses.forEach((resp, index) => {
        results.push({
          success: !resp.error,
          token: tokens[index],
          error: resp.error?.message,
        });
      });

      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`FCM batch send failed: ${errorMessage}`, {
        tokens: tokens.length,
        payload: { title: payload.title, body: payload.body },
      });
      throw error;
    }
  }

  /**
   * Send with retry logic and exponential backoff
   *
   * @param tokens - Array of FCM device tokens
   * @param payload - Notification payload
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns Array of send results for each token
   */
  async sendWithRetry(
    tokens: string[],
    payload: NotificationPayload,
    maxRetries: number = 3,
  ): Promise<FcmSendResult[]> {
    let attempt = 0;
    let lastError: Error = new Error('All retry attempts failed');

    while (attempt < maxRetries) {
      try {
        return await this.sendToFCM(tokens, payload);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retriable
        const errorMessage = lastError.message;
        const isRetriable = PushNotificationService.RETRIABLE_ERROR_CODES.some(
          (code) => errorMessage.includes(code),
        );

        if (!isRetriable) {
          this.logger.warn(
            `Non-retriable FCM error: ${errorMessage}, not retrying`,
          );
          throw lastError;
        }

        attempt++;

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(
            `FCM send attempt ${attempt} failed (retriable), retrying in ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get active device tokens for a user
   *
   * @param userId - The user ID
   * @param userType - The user type
   * @returns Array of active device tokens
   */
  private async getActiveTokens(
    userId: string,
    userType: UserType,
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
   *
   * @param userIds - Array of user IDs
   * @param userType - The user type
   * @returns Array of active device tokens
   */
  private async getActiveTokensForUsers(
    userIds: string[],
    userType: UserType,
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
   * Identify tokens that failed permanently (invalid)
   *
   * @param tokens - Array of tokens that were sent
   * @param results - Array of send results
   * @returns Array of invalid token strings
   */
  private async identifyInvalidTokens(
    tokens: string[],
    results: FcmSendResult[],
  ): Promise<string[]> {
    return results.filter((r) => !r.success).map((r) => r.token);
  }

  /**
   * Deactivate invalid tokens in the database
   *
   * @param tokens - Array of tokens to deactivate
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

  /**
   * Sends a push notification when an order is created.
   * Notifies the customer about their new order.
   *
   * @param customerId - The customer ID
   * @param orderPayload - Order details for the notification
   * @returns Number of successful sends
   */
  async sendOrderCreatedNotification(
    customerId: string,
    orderPayload: OrderNotificationPayloadDto,
  ): Promise<number> {
    const title = 'Order Confirmed! 🛒';
    const body = `Your order #${orderPayload.orderNumber} of ₹${orderPayload.totalAmount} ${orderPayload.currency} has been placed successfully.`;

    const payload: NotificationPayload = {
      title,
      body,
      data: orderPayload.toDataPayload(),
      sound: 'default',
    };

    try {
      const successCount = await this.sendToUser(
        customerId,
        UserType.CUSTOMER,
        payload,
      );

      this.logger.log(
        `Order created notification sent for order ${orderPayload.orderNumber} to customer ${customerId}: ${successCount} success`,
      );

      return successCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send order created notification for order ${orderPayload.orderNumber}: ${errorMessage}`,
      );
      return 0;
    }
  }

  /**
   * Sends a push notification to vendor about a new order.
   *
   * @param vendorId - The vendor ID
   * @param orderPayload - Order details for the notification
   * @returns Number of successful sends
   */
  async sendOrderToVendorNotification(
    vendorId: string,
    orderPayload: OrderNotificationPayloadDto,
  ): Promise<number> {
    const title = 'New Order Received! 📦';
    const body = `New order #${orderPayload.orderNumber} received. Amount: ₹${orderPayload.totalAmount} ${orderPayload.currency}`;

    const payload: NotificationPayload = {
      title,
      body,
      data: orderPayload.toDataPayload(),
      sound: 'default',
    };

    try {
      const successCount = await this.sendToUser(
        vendorId,
        UserType.VENDOR,
        payload,
      );

      this.logger.log(
        `Vendor notification sent for order ${orderPayload.orderNumber} to vendor ${vendorId}: ${successCount} success`,
      );

      return successCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send vendor notification for order ${orderPayload.orderNumber}: ${errorMessage}`,
      );
      return 0;
    }
  }
}
