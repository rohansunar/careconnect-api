import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './services/notification.service';
import { PushNotificationService } from './services/push-notification.service';
import { EmailService } from './services/email.service';
import { OnPaymentSucceededNotificationHandler } from './services/handlers/on-payment-succeeded-notification.handler';
import { CqrsModule } from '@nestjs/cqrs';

/**
 * NotificationModule coordinates all notification-related services.
 *
 * Services provided:
 * - NotificationService: Main coordinator for all notification channels
 * - PushNotificationService: Handles FCM push notifications
 * - EmailService: Handles email sending with template support
 */
@Module({
  imports: [ConfigModule, CqrsModule],
  providers: [
    NotificationService,
    PushNotificationService,
    EmailService,
    OnPaymentSucceededNotificationHandler,
  ],
  exports: [NotificationService, PushNotificationService, EmailService],
})
export class NotificationModule {}
