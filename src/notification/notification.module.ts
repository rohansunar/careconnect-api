import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './services/notification.service';
import { PushNotificationService } from './services/push-notification.service';
import { EmailService } from './services/email.service';

/**
 * NotificationModule coordinates all notification-related services.
 *
 * Services provided:
 * - NotificationService: Main coordinator for all notification channels
 * - PushNotificationService: Handles FCM push notifications
 * - EmailService: Handles email sending with template support
 */
@Module({
  imports: [ConfigModule],
  providers: [NotificationService, PushNotificationService, EmailService],
  exports: [NotificationService, PushNotificationService, EmailService],
})
export class NotificationModule {}
