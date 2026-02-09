import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../../common/database/prisma.service';
import { NOTIFICATION_CONFIG } from '../../config/notification.config';
import { UserType } from '../../dto/user-type.enum';

/**
 * Result of a push notification send operation
 */
export interface PushSendResult {
    success: boolean;
    token: string;
    error?: string;
}

/**
 * Push notification payload structure
 */
export interface PushNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
    sound?: string;
    badge?: number;
}

/**
 * PushChannelService handles push notification delivery via Firebase Cloud Messaging
 * 
 * Responsibilities:
 * - Send push notifications via FCM
 * - Manage device tokens
 * - Handle batch sending with FCM limit (500 tokens)
 * - Automatic token invalidation on failure
 * - Retry logic with exponential backoff
 * 
 * This service follows the Single Responsibility Principle by handling
 * ONLY push notification transmission.
 */
@Injectable()
export class PushChannelService implements OnModuleInit {
    private readonly logger = new Logger(PushChannelService.name);
    private messaging: admin.messaging.Messaging | null = null;
    private readonly maxRetries: number;
    private readonly retryDelayMs: number;
    private readonly batchSize: number;

    private static readonly RETRIABLE_ERROR_CODES = [
        'UNAVAILABLE',
        'INTERNAL',
        'TOO_MANY_REQUESTS',
        '503',
        '500',
        '429',
    ];

    constructor(private readonly prisma: PrismaService) {
        this.maxRetries = NOTIFICATION_CONFIG.retryAttempts.push;
        this.retryDelayMs = NOTIFICATION_CONFIG.retryDelayMs.push;
        this.batchSize = NOTIFICATION_CONFIG.batchSizes.push;
    }

    /**
     * Initialize Firebase Admin SDK on module initialization
     */
    async onModuleInit(): Promise<void> {
        await this.initializeFirebase();
    }

    /**
     * Initialize Firebase Admin SDK with service account credentials
     */
    private async initializeFirebase(): Promise<void> {
        try {
            const credentialsPath = path.resolve(
                process.cwd(),
                process.env.FIREBASE_CREDENTIALS_FILE || 'firebase-service-account.json',
            );

            if (!fs.existsSync(credentialsPath)) {
                throw new Error(`Firebase credentials file not found at: ${credentialsPath}`);
            }

            const credentialsContent = fs.readFileSync(credentialsPath, 'utf-8');
            const serviceAccount = JSON.parse(credentialsContent);

            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                this.logger.log('Firebase Admin SDK initialized successfully');
            }

            this.messaging = admin.messaging();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to initialize Firebase Admin SDK: ${errorMessage}`);
            this.messaging = null;
        }
    }

    /**
     * Sends a push notification to a single device token with retry logic
     * 
     * @param token - FCM device token
     * @param payload - Notification payload
     * @param correlationId - Optional correlation ID for tracking
     * @returns PushSendResult with success status
     */
    async send(
        token: string,
        payload: PushNotificationPayload,
        correlationId?: string,
    ): Promise<PushSendResult> {
        if (!this.messaging) {
            this.logger.error('Firebase messaging not initialized', { correlationId });
            return {
                success: false,
                token,
                error: 'Firebase messaging not initialized',
            };
        }

        if (!token || token.trim().length === 0) {
            return {
                success: false,
                token,
                error: 'Device token is empty or invalid',
            };
        }

        let attemptCount = 0;
        let lastError: Error | null = null;

        while (attemptCount < this.maxRetries) {
            attemptCount++;

            try {
                this.logger.debug(
                    `Sending push notification (attempt ${attemptCount}/${this.maxRetries})`,
                    { correlationId, token: token.substring(0, 10) + '...' },
                );

                await this.messaging.send({
                    token,
                    notification: {
                        title: payload.title,
                        body: payload.body,
                        imageUrl: payload.imageUrl,
                    },
                    data: payload.data,
                    android: {
                        priority: 'high',
                        notification: {
                            sound: payload.sound || 'default',
                        },
                    },
                    apns: {
                        payload: {
                            aps: {
                                sound: payload.sound || 'default',
                                badge: payload.badge,
                            },
                        },
                    },
                });

                this.logger.log(`Push notification sent successfully (attempt ${attemptCount})`, {
                    correlationId,
                });

                return {
                    success: true,
                    token,
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const errorMessage = lastError.message;

                this.logger.warn(
                    `Push notification attempt ${attemptCount} failed: ${errorMessage}`,
                    { correlationId },
                );

                // Check if error is retriable
                if (!this.isRetriableError(errorMessage)) {
                    this.logger.error(`Non-retriable push error: ${errorMessage}`, {
                        correlationId,
                    });

                    // Deactivate invalid token
                    if (this.isInvalidTokenError(errorMessage)) {
                        await this.deactivateToken(token);
                    }

                    break;
                }

                // Wait before retry (exponential backoff)
                if (attemptCount < this.maxRetries) {
                    const delay = this.retryDelayMs * Math.pow(2, attemptCount - 1);
                    this.logger.debug(`Retrying push send in ${delay}ms`, { correlationId });
                    await this.sleep(delay);
                }
            }
        }

        const errorMessage = lastError?.message || 'Unknown error';
        this.logger.error(
            `Push notification failed permanently after ${attemptCount} attempts: ${errorMessage}`,
            { correlationId },
        );

        return {
            success: false,
            token,
            error: errorMessage,
        };
    }




    /**
     * Deactivate a single invalid token
     */
    private async deactivateToken(token: string): Promise<void> {
        await this.prisma.deviceToken.updateMany({
            where: {
                device_token: token,
            },
            data: {
                is_active: false,
                updated_at: new Date(),
            },
        });

        this.logger.log(`Deactivated invalid token: ${token.substring(0, 10)}...`);
    }


    /**
     * Check if error indicates invalid token
     */
    private isInvalidTokenError(errorMessage: string): boolean {
        const invalidTokenPatterns = [
            'INVALID_ARGUMENT',
            'UNREGISTERED',
            'invalid-registration-token',
            'registration-token-not-registered',
        ];

        return invalidTokenPatterns.some((pattern) =>
            errorMessage.toLowerCase().includes(pattern.toLowerCase()),
        );
    }

    /**
     * Determines if an error is retriable
     */
    private isRetriableError(errorMessage: string): boolean {
        return PushChannelService.RETRIABLE_ERROR_CODES.some((code) =>
            errorMessage.includes(code),
        );
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Generates a unique correlation ID for tracking
     */
    generateCorrelationId(): string {
        return `push-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
}
