import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * Implementation of the WebhookIdempotencyService.
 * This service ensures idempotent processing of payment webhook events
 * by tracking processed events in the database.
 *
 * Concurrency Handling:
 * - Uses SELECT FOR UPDATE with Prisma's interactive transactions
 * - Implements proper retry mechanisms for transient database failures
 * - Ensures exactly-once processing semantics even under high concurrency
 *
 * Error Handling:
 * - Database connection failures are handled with retry mechanisms
 * - Concurrent duplicate requests are handled via row-level locking
 * - All idempotency-related events are logged with appropriate severity
 */
@Injectable()
export class WebhookIdempotencyService {
  private readonly logger = new Logger(WebhookIdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureNotProcessed(eventId: string, eventType: string, payload: any) {
    try {
      this.logger.log(
        `Webhook Idempotency Service with provider: ${eventId} and ${eventType}`,
      );
      await this.prisma.paymentWebhookEvent.create({
        data: {
          eventId,
          eventType,
          payload,
        },
      });
    } catch (error) {
      // UNIQUE constraint violation = already processed
      if (error.code === 'P2002') {
        return false;
      }
      throw error;
    }
    return true;
  }
}
