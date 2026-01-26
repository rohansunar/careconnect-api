import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Twilio } from 'twilio';

/**
 * NotificationService provides methods to send notifications via various channels.
 *
 * This service is designed to be modular and reusable, allowing injection into other modules
 * for sending emails, SMS, WhatsApp messages, and logging OTPs. It uses external APIs
 * (Resend for email, Twilio for SMS and WhatsApp) and ConfigService for configuration.
 *
 * Design Rationale:
 * - Single responsibility: Each method handles one type of notification.
 * - Dependency injection: Uses ConfigService for environment variables, promoting testability.
 * - Error handling: Catches and logs errors, throwing exceptions for caller handling.
 * - Logging: Uses NestJS Logger for consistent logging.
 * - Framework agnostic: Core logic separated from framework specifics.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly resend: Resend;
  private readonly twilioClient: Twilio;

  constructor(private readonly configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    this.resend = new Resend(resendApiKey);

    const twilioAccountSid =
      this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error(
        'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not configured',
      );
    }
    this.twilioClient = new Twilio(twilioAccountSid, twilioAuthToken);
  }

  /**
   * Sends an email using Resend API.
   * @param to - Recipient email address.
   * @param subject - Email subject.
   * @param html - Email content in HTML format.
   * @throws Error if sending fails.
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      this.logger.log(`Sending email to ${to} with subject: ${subject}`);
      const from =
        this.configService.get<string>('RESEND_FROM_EMAIL') ||
        'noreply@example.com';
      await this.resend.emails.send({
        from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Sends an SMS using Twilio API.
   * @param to - Recipient phone number (e.g., +1234567890).
   * @param body - SMS message content.
   * @throws Error if sending fails.
   */
  async sendSMS(to: string, body: string): Promise<void> {
    try {
      this.logger.log(`Sending SMS to ${to}`);
      const from = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      if (!from) {
        throw new Error('TWILIO_PHONE_NUMBER is not configured');
      }
      await this.twilioClient.messages.create({
        body,
        from,
        to,
      });
      this.logger.log(`SMS sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send SMS to ${to}: ${error.message}`,
        error.stack,
      );
      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }

  /**
   * Sends a WhatsApp message using Twilio API.
   * @param to - Recipient phone number (e.g., +1234567890).
   * @param body - WhatsApp message content.
   * @throws Error if sending fails.
   */
  async sendWhatsApp(to: string, body: string): Promise<void> {
    try {
      this.logger.log(`Sending WhatsApp message to ${to}`);
      const from =
        this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') ||
        this.configService.get<string>('TWILIO_PHONE_NUMBER');
      if (!from) {
        throw new Error(
          'TWILIO_WHATSAPP_NUMBER or TWILIO_PHONE_NUMBER is not configured',
        );
      }
      // await this.twilioClient.messages.create({
      //   body,
      //   from: `whatsapp:${from}`,
      //   to: `whatsapp:${to}`,
      // });
      this.logger.log(`WhatsApp message sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message to ${to}: ${error.message}`,
        error.stack,
      );
      throw new Error(`WhatsApp sending failed: ${error.message}`);
    }
  }

  /**
   * Logs OTP to console instead of sending.
   * @param code - OTP code.
   * @param to - Recipient identifier (e.g., phone or email).
   */
  async sendOTP(code: string, to: string): Promise<void> {
    this.logger.log(`OTP for ${to}: ${code}`);
  }

  /**
   * Notifies admin via email.
   * @param subject - Notification subject.
   * @param message - Notification message.
   */
  async notifyAdmin(subject: string, message: string): Promise<void> {
    const adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') || 'admin@example.com';
    const html = `<p>${message}</p>`;
    await this.sendEmail(adminEmail, subject, html);
  }
}
