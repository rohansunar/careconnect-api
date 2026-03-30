import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

// Channel Services
import {
  EmailChannelService,
  SmsChannelService,
  WhatsAppChannelService,
  PushChannelService,
} from './services/channels';

/**
 * NotificationModule
 *
 * Modern notification system with clean architecture:
 * - Channel Services: Handle specific communication channels (email, SMS, WhatsApp, push)
 */
@Module({
  imports: [ConfigModule, CqrsModule],
  providers: [
    // Channel Services
    EmailChannelService,
    SmsChannelService,
    WhatsAppChannelService,
    PushChannelService,
  ],
  exports: [
    // Export channel services for direct use
    EmailChannelService,
    SmsChannelService,
    WhatsAppChannelService,
    PushChannelService,
  ],
})
export class NotificationModule {}
