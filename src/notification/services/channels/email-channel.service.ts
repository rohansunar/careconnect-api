import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { NOTIFICATION_CONFIG } from '../../config/notification.config';

/**
 * Result of an email send operation
 */
export interface EmailSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
    attemptCount: number;
}

/**
 * EmailChannelService handles email delivery via Resend API
 * 
 * Responsibilities:
 * - Send individual emails with HTML content
 * - Validate email addresses
 * - Implement retry logic with exponential backoff
 * - Track delivery attempts and errors
 * - Rate limiting enforcement
 * 
 * This service follows the Single Responsibility Principle by handling
 * ONLY email transmission. Template rendering and business logic are
 * handled by other services.
 */
@Injectable()
export class EmailChannelService {
    private readonly logger = new Logger(EmailChannelService.name);
    private readonly resend: Resend;
    private readonly fromEmail: string;
    private readonly maxRetries: number;
    private readonly retryDelayMs: number;

    constructor(private readonly configService: ConfigService) {
        const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
        if (!resendApiKey) {
            throw new Error('RESEND_API_KEY is not configured');
        }

        this.resend = new Resend(resendApiKey);
        this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'noreply@waterdelivery.com';
        this.maxRetries = NOTIFICATION_CONFIG.retryAttempts.email;
        this.retryDelayMs = NOTIFICATION_CONFIG.retryDelayMs.email;

        this.logger.log('EmailChannelService initialized');
    }

    /**
     * Sends an email with retry logic
     * 
     * @param to - Recipient email address
     * @param subject - Email subject line
     * @param html - HTML content of the email
     * @param correlationId - Optional correlation ID for tracking
     * @returns EmailSendResult with success status and details
     */
    async sendEmail(
        to: string,
        subject: string,
        html: string,
        correlationId?: string,
    ): Promise<EmailSendResult> {
        // Validate email address
        if (!this.isValidEmail(to)) {
            this.logger.error(`Invalid email address: ${to}`, { correlationId });
            return {
                success: false,
                error: 'Invalid email address',
                attemptCount: 0,
            };
        }

        let attemptCount = 0;
        let lastError: Error | null = null;

        // Retry loop
        while (attemptCount < this.maxRetries) {
            attemptCount++;

            try {
                this.logger.debug(
                    `Sending email to ${to} (attempt ${attemptCount}/${this.maxRetries})`,
                    { correlationId, subject },
                );

                const response = await this.resend.emails.send({
                    from: this.fromEmail,
                    to,
                    subject,
                    html,
                });

                this.logger.log(
                    `Email sent successfully to ${to} (attempt ${attemptCount})`,
                    { correlationId, messageId: response.data?.id },
                );

                return {
                    success: true,
                    messageId: response.data?.id,
                    attemptCount,
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const errorMessage = lastError.message;

                this.logger.warn(
                    `Email send attempt ${attemptCount} failed for ${to}: ${errorMessage}`,
                    { correlationId, error: errorMessage },
                );

                // Check if error is retriable
                if (!this.isRetriableError(errorMessage)) {
                    this.logger.error(
                        `Non-retriable email error for ${to}: ${errorMessage}`,
                        { correlationId },
                    );
                    break;
                }

                // Wait before retry (exponential backoff)
                if (attemptCount < this.maxRetries) {
                    const delay = this.retryDelayMs * Math.pow(2, attemptCount - 1);
                    this.logger.debug(
                        `Retrying email send in ${delay}ms`,
                        { correlationId },
                    );
                    await this.sleep(delay);
                }
            }
        }

        // All retries failed
        const errorMessage = lastError?.message || 'Unknown error';
        this.logger.error(
            `Email send failed permanently for ${to} after ${attemptCount} attempts: ${errorMessage}`,
            { correlationId },
        );

        return {
            success: false,
            error: errorMessage,
            attemptCount,
        };
    }

    /**
     * Sends an email without retry logic (single attempt)
     * Useful for non-critical notifications
     * 
     * @param to - Recipient email address
     * @param subject - Email subject line
     * @param html - HTML content of the email
     * @param correlationId - Optional correlation ID for tracking
     * @returns EmailSendResult with success status and details
     */
    async sendEmailSingleAttempt(
        to: string,
        subject: string,
        html: string,
        correlationId?: string,
    ): Promise<EmailSendResult> {
        if (!this.isValidEmail(to)) {
            this.logger.error(`Invalid email address: ${to}`, { correlationId });
            return {
                success: false,
                error: 'Invalid email address',
                attemptCount: 0,
            };
        }

        try {
            this.logger.debug(`Sending email to ${to} (single attempt)`, {
                correlationId,
                subject,
            });

            const response = await this.resend.emails.send({
                from: this.fromEmail,
                to,
                subject,
                html,
            });

            this.logger.log(`Email sent successfully to ${to}`, {
                correlationId,
                messageId: response.data?.id,
            });

            return {
                success: true,
                messageId: response.data?.id,
                attemptCount: 1,
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);

            this.logger.error(`Email send failed for ${to}: ${errorMessage}`, {
                correlationId,
            });

            return {
                success: false,
                error: errorMessage,
                attemptCount: 1,
            };
        }
    }

    /**
     * Validates email address format
     * 
     * @param email - Email address to validate
     * @returns true if email format is valid
     */
    private isValidEmail(email: string): boolean {
        if (!email || typeof email !== 'string') {
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Determines if an error is retriable based on error message patterns
     * 
     * @param errorMessage - Error message from email provider
     * @returns true if error should be retried
     */
    private isRetriableError(errorMessage: string): boolean {
        const retriablePatterns = [
            'timeout',
            'network',
            'connection',
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            '429', // Rate limit
            '500', // Server error
            '502', // Bad gateway
            '503', // Service unavailable
            '504', // Gateway timeout
        ];

        const lowerMessage = errorMessage.toLowerCase();
        return retriablePatterns.some((pattern) =>
            lowerMessage.includes(pattern.toLowerCase()),
        );
    }

    /**
     * Sleep utility for retry delays
     * 
     * @param ms - Milliseconds to sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Generates a unique correlation ID for tracking
     * 
     * @returns Unique correlation ID
     */
    generateCorrelationId(): string {
        return `email-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
}
