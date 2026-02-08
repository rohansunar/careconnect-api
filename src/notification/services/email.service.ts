import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import React from 'react';
import { renderToHtml } from '../../email-templates/utils/renderTemplate';
import { VendorOrderConfirmationTemplate } from '../../email-templates/templates/vendor-order-confirmation';
import { AdminOrderConfirmationTemplate } from '../../email-templates/templates/admin-order-confirmation';
import { OrderConfirmationNotificationPayloadDto } from '../dto/order-confirmation-notification-payload.dto';

/**
 * EmailService handles sending HTML emails with TSX template rendering.
 *
 * Design Rationale:
 * - Single responsibility: Handles only email sending with template support
 * - Template-based: Uses TSX templates for consistent email formatting
 * - Error handling: Catches and logs errors without throwing to caller
 * - Retry logic: Implements exponential backoff for transient failures
 * - Observability: Includes correlation IDs and monitoring hooks for integration
 *
 * @see NotificationService for the main notification coordinator
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // ms

  constructor(private readonly configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!resendApiKey) {
      this.logger.error('RESEND_API_KEY is not configured');
      throw new Error('RESEND_API_KEY is not configured');
    }
    this.resend = new Resend(resendApiKey);
  }

  /**
   * Generates a correlation ID for tracking email delivery attempts.
   * This can be used to trace email delivery across systems.
   *
   * @returns A unique correlation ID
   */
  private generateCorrelationId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Validates an email address format.
   *
   * @param email - Email address to validate
   * @returns true if email format is valid, false otherwise
   */
  private isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates required payload fields for order confirmation emails.
   *
   * @param payload - Order confirmation notification payload
   * @returns Object with validation result and error message if invalid
   */
  private validateOrderConfirmationPayload(
    payload: OrderConfirmationNotificationPayloadDto,
  ): { isValid: boolean; errorMessage?: string } {
    if (!payload) {
      return { isValid: false, errorMessage: 'Payload is null or undefined' };
    }

    if (!payload.orderId) {
      return {
        isValid: false,
        errorMessage: 'Missing required field: orderId',
      };
    }

    if (!payload.orderNumber) {
      return {
        isValid: false,
        errorMessage: 'Missing required field: orderNumber',
      };
    }

    if (!payload.formattedAmount) {
      return {
        isValid: false,
        errorMessage: 'Missing required field: formattedAmount',
      };
    }

    if (!payload.currency) {
      return {
        isValid: false,
        errorMessage: 'Missing required field: currency',
      };
    }

    return { isValid: true };
  }

  /**
   * Sends an email with retry logic for transient failures.
   *
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - Email content in HTML format
   * @param templateType - Type of template being used (for logging context)
   * @param correlationId - Unique identifier for tracking this delivery attempt
   * @param maxRetries - Maximum retry attempts (default: 3)
   * @returns Promise<boolean> - true if email sent successfully
   */
  private async sendEmailWithRetry(
    to: string,
    subject: string,
    html: string,
    templateType: string,
    correlationId: string,
    maxRetries: number = EmailService.MAX_RETRIES,
  ): Promise<boolean> {
    // Validate email address
    if (!this.isValidEmail(to)) {
      this.logger.error(
        `[${correlationId}] Invalid email address provided: ${to}`,
      );
      // TODO: Integrate with observability platform to track invalid email attempts
      // Example: metrics.increment('email.validation.error', { templateType });
      return false;
    }

    const from =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'noreply@example.com';

    // Log delivery attempt
    this.logger.log(
      `[${correlationId}] Attempting to send ${templateType} email to ${to} with subject: "${subject}"`,
    );
    // TODO: Integrate with observability platform to track delivery attempts
    // Example: metrics.increment('email.delivery.attempt', { templateType, recipient: to });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.logger.log(
          `[${correlationId}] Sending email to ${to} (attempt ${attempt + 1}/${maxRetries})`,
        );

        const response = await this.resend.emails.send({
          from,
          to,
          subject,
          html,
        });

        // Log successful delivery
        this.logger.log(
          `[${correlationId}] Email sent successfully to ${to}. Response ID: ${response?.data?.id || 'N/A'}`,
        );
        // TODO: Integrate with observability platform to track successful deliveries
        // Example: metrics.increment('email.delivery.success', { templateType, recipient: to });
        // Example: telemetry.trackEvent('EmailSent', { correlationId, templateType, recipient: to, responseId: response?.data?.id });

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Log retryable errors at warn level
        this.logger.warn(
          `[${correlationId}] Email send attempt ${attempt + 1} failed for ${to}: ${errorMessage}`,
        );
        // TODO: Integrate with observability platform to track retry attempts
        // Example: metrics.increment('email.delivery.retry', { templateType, recipient: to, attempt: attempt + 1 });

        // Check if error is retriable
        const isRetriable = this.isRetriableError(errorMessage);

        if (!isRetriable) {
          // Log non-retriable errors at error level with full stack
          this.logger.error(
            `[${correlationId}] Non-retriable error sending ${templateType} email to ${to}: ${errorMessage}`,
            errorStack,
          );
          // TODO: Integrate with observability platform to track non-retriable errors
          // Example: metrics.increment('email.delivery.error.non-retriable', { templateType, recipient: to, errorType: this.getErrorType(error) });
          // Example: telemetry.trackException(error, { correlationId, templateType, recipient: to });

          return false;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = EmailService.RETRY_DELAYS[attempt] || 1000;
          this.logger.log(
            `[${correlationId}] Retrying email to ${to} in ${delay}ms...`,
          );
          await this.sleep(delay);
        }
      }
    }

    // Log final failure after all retries exhausted
    this.logger.error(
      `[${correlationId}] Failed to send ${templateType} email to ${to} after ${maxRetries} attempts`,
    );
    // TODO: Integrate with observability platform to track final failures
    // Example: metrics.increment('email.delivery.failure', { templateType, recipient: to });
    // Example: telemetry.trackEvent('EmailDeliveryFailed', { correlationId, templateType, recipient: to, maxRetries });

    return false;
  }

  /**
   * Determines if an error is retriable based on error message patterns.
   *
   * @param errorMessage - The error message to check
   * @returns boolean - true if error is retriable
   */
  private isRetriableError(errorMessage: string): boolean {
    const retriablePatterns = [
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'temporarily unavailable',
      'rate limit',
      '429',
      '500',
      '502',
      '503',
      '504',
      'network',
      'connection',
    ];

    return retriablePatterns.some((pattern) =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase()),
    );
  }

  /**
   * Categorizes error type for observability tracking.
   *
   * @param error - The error object
   * @returns A string representing the error type
   */
  private getErrorType(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('timeout')) return 'timeout';
      if (message.includes('rate limit')) return 'rate_limit';
      if (message.includes('invalid')) return 'validation';
      if (message.includes('unauthorized')) return 'auth';
      if (message.includes('network') || message.includes('connection'))
        return 'network';
    }
    return 'unknown';
  }

  /**
   * Helper function to pause execution for a specified duration.
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sends a single email without retry logic.
   * Used for order confirmation emails that require only one attempt.
   *
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - Email content in HTML format
   * @param templateType - Type of template being used (for logging context)
   * @param correlationId - Unique identifier for tracking this delivery attempt
   * @returns Promise<boolean> - true if email sent successfully
   */
  private async sendSingleEmail(
    to: string,
    subject: string,
    html: string,
    templateType: string,
    correlationId: string,
  ): Promise<boolean> {
    // Validate email address
    if (!this.isValidEmail(to)) {
      this.logger.error(
        `[${correlationId}] Invalid email address provided: ${to}`,
      );
      // TODO: Integrate with observability platform to track invalid email attempts
      // Example: metrics.increment('email.validation.error', { templateType });
      return false;
    }

    const from =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'noreply@example.com';

    try {
      // Log delivery attempt
      this.logger.log(
        `[${correlationId}] Attempting to send ${templateType} email to ${to} with subject: "${subject}"`,
      );
      // TODO: Integrate with observability platform to track delivery attempts
      // Example: metrics.increment('email.delivery.attempt', { templateType, recipient: to });

      const response = await this.resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      // Log successful delivery
      this.logger.log(
        `[${correlationId}] Email sent successfully to ${to}. Response ID: ${response?.data?.id || 'N/A'}`,
      );
      // TODO: Integrate with observability platform to track successful deliveries
      // Example: metrics.increment('email.delivery.success', { templateType, recipient: to });
      // Example: telemetry.trackEvent('EmailSent', { correlationId, templateType, recipient: to, responseId: response?.data?.id });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Log failure at error level with full stack
      this.logger.error(
        `[${correlationId}] Failed to send ${templateType} email to ${to}: ${errorMessage}`,
        errorStack,
      );
      // TODO: Integrate with observability platform to track failures
      // Example: metrics.increment('email.delivery.error', { templateType, recipient: to, errorType: this.getErrorType(error) });
      // Example: telemetry.trackException(error, { correlationId, templateType, recipient: to });

      return false;
    }
  }

  /**
   * Sends an order confirmation email to a vendor.
   * Uses single-attempt delivery without retry logic.
   *
   * @param vendorEmail - Vendor's email address
   * @param payload - Order confirmation notification data
   * @returns Promise<boolean> - true if email sent successfully
   */
  async sendVendorOrderConfirmationEmail(
    vendorEmail: string,
    payload: OrderConfirmationNotificationPayloadDto,
  ): Promise<boolean> {
    const correlationId = this.generateCorrelationId();
    const templateType = 'vendor-order-confirmation';
    const subject = `New Order Received - Order #${payload.orderNumber}`;

    try {
      // Validate email address
      if (!this.isValidEmail(vendorEmail)) {
        this.logger.error(
          `[${correlationId}] Invalid vendor email address: ${vendorEmail}`,
        );
        // TODO: Integrate with observability platform to track validation errors
        // Example: metrics.increment('email.validation.error', { templateType, field: 'vendorEmail' });
        return false;
      }

      // Validate payload
      const payloadValidation = this.validateOrderConfirmationPayload(payload);
      if (!payloadValidation.isValid) {
        this.logger.error(
          `[${correlationId}] Invalid payload for vendor order confirmation email: ${payloadValidation.errorMessage}`,
        );
        // TODO: Integrate with observability platform to track validation errors
        // Example: metrics.increment('email.validation.error', { templateType, field: 'payload' });
        return false;
      }

      // Log template rendering attempt
      this.logger.log(
        `[${correlationId}] Rendering ${templateType} template for vendor: ${payload.vendorName || 'Unknown'}`,
      );

      const template = React.createElement(VendorOrderConfirmationTemplate, {
        recipientName: payload.vendorName || 'Vendor',
        vendorName: payload.vendorName || 'Vendor',
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        formattedAmount: payload.formattedAmount,
        currency: payload.currency,
        itemCount: payload.itemCount || 0,
        paymentMode: payload.paymentMode,
        orderDate: payload.orderDate,
        estimatedDeliveryTime: payload.estimatedDeliveryTime,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        deliveryAddress: payload.deliveryAddress,
        dashboardUrl: payload.dashboardUrl || '',
      });

      let html: string;
      try {
        html = await renderToHtml(template);
        // Log successful template rendering
        this.logger.log(
          `[${correlationId}] Template rendered successfully for ${templateType}`,
        );
        // TODO: Integrate with observability platform to track template rendering success
        // Example: metrics.increment('email.template.render.success', { templateType });
      } catch (renderError) {
        const renderErrorMessage =
          renderError instanceof Error ? renderError.message : 'Unknown error';
        const renderErrorStack =
          renderError instanceof Error ? renderError.stack : undefined;

        // Log template rendering error separately
        this.logger.error(
          `[${correlationId}] Failed to render ${templateType} template: ${renderErrorMessage}`,
          renderErrorStack,
        );
        // TODO: Integrate with observability platform to track template rendering errors
        // Example: metrics.increment('email.template.render.error', { templateType });
        // Example: telemetry.trackException(renderError, { correlationId, templateType });

        return false;
      }

      return await this.sendSingleEmail(
        vendorEmail,
        subject,
        html,
        templateType,
        correlationId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Log unexpected errors at error level with full stack
      this.logger.error(
        `[${correlationId}] Unexpected error sending vendor order confirmation email to ${vendorEmail}: ${errorMessage}`,
        errorStack,
      );
      // TODO: Integrate with observability platform to track unexpected errors
      // Example: metrics.increment('email.unexpected.error', { templateType });
      // Example: telemetry.trackException(error, { correlationId, templateType, recipient: vendorEmail });

      return false;
    }
  }

  /**
   * Sends an order confirmation email to an admin.
   * Uses single-attempt delivery without retry logic.
   *
   * @param adminEmail - Admin's email address
   * @param payload - Order confirmation notification data
   * @returns Promise<boolean> - true if email sent successfully
   */
  async sendAdminOrderConfirmationEmail(
    adminEmail: string,
    payload: OrderConfirmationNotificationPayloadDto,
  ): Promise<boolean> {
    const correlationId = this.generateCorrelationId();
    const templateType = 'admin-order-confirmation';
    const subject = `New Order Received - Order #${payload.orderNumber}`;

    try {
      // Validate email address
      if (!this.isValidEmail(adminEmail)) {
        this.logger.error(
          `[${correlationId}] Invalid admin email address: ${adminEmail}`,
        );
        // TODO: Integrate with observability platform to track validation errors
        // Example: metrics.increment('email.validation.error', { templateType, field: 'adminEmail' });
        return false;
      }

      // Validate payload
      const payloadValidation = this.validateOrderConfirmationPayload(payload);
      if (!payloadValidation.isValid) {
        this.logger.error(
          `[${correlationId}] Invalid payload for admin order confirmation email: ${payloadValidation.errorMessage}`,
        );
        // TODO: Integrate with observability platform to track validation errors
        // Example: metrics.increment('email.validation.error', { templateType, field: 'payload' });
        return false;
      }

      // Log template rendering attempt
      this.logger.log(
        `[${correlationId}] Rendering ${templateType} template for admin`,
      );

      const template = React.createElement(AdminOrderConfirmationTemplate, {
        recipientName: 'Admin',
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        formattedAmount: payload.formattedAmount,
        currency: payload.currency,
        itemCount: payload.itemCount || 0,
        paymentMode: payload.paymentMode,
        vendorName: payload.vendorName || 'Unknown Vendor',
        orderDate: payload.orderDate,
        estimatedDeliveryTime: payload.estimatedDeliveryTime,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        deliveryAddress: payload.deliveryAddress,
        adminDashboardUrl: payload.adminDashboardUrl || '',
      });

      let html: string;
      try {
        html = await renderToHtml(template);
        // Log successful template rendering
        this.logger.log(
          `[${correlationId}] Template rendered successfully for ${templateType}`,
        );
        // TODO: Integrate with observability platform to track template rendering success
        // Example: metrics.increment('email.template.render.success', { templateType });
      } catch (renderError) {
        const renderErrorMessage =
          renderError instanceof Error ? renderError.message : 'Unknown error';
        const renderErrorStack =
          renderError instanceof Error ? renderError.stack : undefined;

        // Log template rendering error separately
        this.logger.error(
          `[${correlationId}] Failed to render ${templateType} template: ${renderErrorMessage}`,
          renderErrorStack,
        );
        // TODO: Integrate with observability platform to track template rendering errors
        // Example: metrics.increment('email.template.render.error', { templateType });
        // Example: telemetry.trackException(renderError, { correlationId, templateType });

        return false;
      }

      return await this.sendSingleEmail(
        adminEmail,
        subject,
        html,
        templateType,
        correlationId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Log unexpected errors at error level with full stack
      this.logger.error(
        `[${correlationId}] Unexpected error sending admin order confirmation email to ${adminEmail}: ${errorMessage}`,
        errorStack,
      );
      // TODO: Integrate with observability platform to track unexpected errors
      // Example: metrics.increment('email.unexpected.error', { templateType });
      // Example: telemetry.trackException(error, { correlationId, templateType, recipient: adminEmail });

      return false;
    }
  }

  /**
   * Sends a generic email without using a template.
   *
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - Email content in HTML format
   * @returns Promise<boolean> - true if email sent successfully
   */
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const correlationId = this.generateCorrelationId();
    const templateType = 'generic';

    return await this.sendEmailWithRetry(
      to,
      subject,
      html,
      templateType,
      correlationId,
    );
  }
}
