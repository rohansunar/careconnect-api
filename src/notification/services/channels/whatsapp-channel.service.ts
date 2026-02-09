import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { NOTIFICATION_CONFIG } from '../../config/notification.config';

/**
 * Result of a WhatsApp send operation
 */
export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attemptCount: number;
}

/**
 * WhatsAppChannelService handles WhatsApp message delivery via Twilio API
 *
 * Responsibilities:
 * - Send WhatsApp messages
 * - Validate phone numbers
 * - Implement retry logic with exponential backoff
 * - Track delivery attempts and errors
 * - Rate limiting enforcement
 *
 * This service follows the Single Responsibility Principle by handling
 * ONLY WhatsApp transmission.
 */
@Injectable()
export class WhatsAppChannelService {
  private readonly logger = new Logger(WhatsAppChannelService.name);
  private readonly twilioClient: Twilio;
  private readonly fromWhatsAppNumber: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromWhatsApp =
      this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') ||
      this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken) {
      throw new Error(
        'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not configured',
      );
    }

    if (!fromWhatsApp) {
      throw new Error(
        'TWILIO_WHATSAPP_NUMBER or TWILIO_PHONE_NUMBER is not configured',
      );
    }

    this.twilioClient = new Twilio(accountSid, authToken);
    this.fromWhatsAppNumber = fromWhatsApp.startsWith('whatsapp:')
      ? fromWhatsApp
      : `whatsapp:${fromWhatsApp}`;
    this.maxRetries = NOTIFICATION_CONFIG.retryAttempts.whatsapp;
    this.retryDelayMs = NOTIFICATION_CONFIG.retryDelayMs.whatsapp;

    this.logger.log('WhatsAppChannelService initialized');
  }

  /**
   * Sends a WhatsApp message with retry logic
   *
   * @param to - Recipient phone number in E.164 format (e.g., +1234567890)
   * @param body - WhatsApp message content
   * @param correlationId - Optional correlation ID for tracking
   * @returns WhatsAppSendResult with success status and details
   */
  async sendWhatsApp(
    to: string,
    body: string,
    correlationId?: string,
  ): Promise<WhatsAppSendResult> {
    // Validate phone number
    if (!this.isValidPhoneNumber(to)) {
      this.logger.error(`Invalid phone number: ${to}`, { correlationId });
      return {
        success: false,
        error:
          'Invalid phone number format. Expected E.164 format (e.g., +1234567890)',
        attemptCount: 0,
      };
    }

    // Validate message body
    if (!body || body.trim().length === 0) {
      this.logger.error('WhatsApp message body is empty', { correlationId });
      return {
        success: false,
        error: 'WhatsApp message body cannot be empty',
        attemptCount: 0,
      };
    }

    // Format recipient number for WhatsApp
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    let attemptCount = 0;
    let lastError: Error | null = null;

    // Retry loop
    while (attemptCount < this.maxRetries) {
      attemptCount++;

      try {
        this.logger.debug(
          `Sending WhatsApp to ${to} (attempt ${attemptCount}/${this.maxRetries})`,
          { correlationId },
        );

        const message = await this.twilioClient.messages.create({
          body,
          from: this.fromWhatsAppNumber,
          to: whatsappTo,
        });

        this.logger.log(
          `WhatsApp sent successfully to ${to} (attempt ${attemptCount})`,
          { correlationId, messageId: message.sid },
        );

        return {
          success: true,
          messageId: message.sid,
          attemptCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message;

        this.logger.warn(
          `WhatsApp send attempt ${attemptCount} failed for ${to}: ${errorMessage}`,
          { correlationId, error: errorMessage },
        );

        // Check if error is retriable
        if (!this.isRetriableError(errorMessage)) {
          this.logger.error(
            `Non-retriable WhatsApp error for ${to}: ${errorMessage}`,
            { correlationId },
          );
          break;
        }

        // Wait before retry (exponential backoff)
        if (attemptCount < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attemptCount - 1);
          this.logger.debug(`Retrying WhatsApp send in ${delay}ms`, {
            correlationId,
          });
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const errorMessage = lastError?.message || 'Unknown error';
    this.logger.error(
      `WhatsApp send failed permanently for ${to} after ${attemptCount} attempts: ${errorMessage}`,
      { correlationId },
    );

    return {
      success: false,
      error: errorMessage,
      attemptCount,
    };
  }

  /**
   * Sends a WhatsApp message without retry logic (single attempt)
   *
   * @param to - Recipient phone number in E.164 format
   * @param body - WhatsApp message content
   * @param correlationId - Optional correlation ID for tracking
   * @returns WhatsAppSendResult with success status and details
   */
  async sendWhatsAppSingleAttempt(
    to: string,
    body: string,
    correlationId?: string,
  ): Promise<WhatsAppSendResult> {
    if (!this.isValidPhoneNumber(to)) {
      this.logger.error(`Invalid phone number: ${to}`, { correlationId });
      return {
        success: false,
        error: 'Invalid phone number format',
        attemptCount: 0,
      };
    }

    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    try {
      this.logger.debug(`Sending WhatsApp to ${to} (single attempt)`, {
        correlationId,
      });

      const message = await this.twilioClient.messages.create({
        body,
        from: this.fromWhatsAppNumber,
        to: whatsappTo,
      });

      this.logger.log(`WhatsApp sent successfully to ${to}`, {
        correlationId,
        messageId: message.sid,
      });

      return {
        success: true,
        messageId: message.sid,
        attemptCount: 1,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`WhatsApp send failed for ${to}: ${errorMessage}`, {
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
   * Validates phone number format (E.164 international format)
   *
   * @param phoneNumber - Phone number to validate
   * @returns true if phone number format is valid
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return false;
    }

    // Remove whatsapp: prefix if present
    const cleanNumber = phoneNumber.replace('whatsapp:', '');

    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(cleanNumber);
  }

  /**
   * Determines if an error is retriable based on Twilio error codes
   *
   * @param errorMessage - Error message from Twilio
   * @returns true if error should be retried
   */
  private isRetriableError(errorMessage: string): boolean {
    const retriablePatterns = [
      'timeout',
      'network',
      'connection',
      'ECONNRESET',
      'ETIMEDOUT',
      '429', // Rate limit
      '500', // Server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504', // Gateway timeout
      '63007', // Twilio WhatsApp: opt-out contact
      '63016', // Twilio WhatsApp: session expired
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
    return `whatsapp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
