import { Module } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { PushNotificationService } from './services/push-notification.service';

@Module({
  providers: [NotificationService, PushNotificationService],
  exports: [NotificationService, PushNotificationService],
})
export class NotificationModule {}
