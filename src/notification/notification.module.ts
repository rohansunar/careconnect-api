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

// Orchestrators
import {
  OrderNotificationOrchestrator,
  SubscriptionNotificationOrchestrator,
} from './services/orchestrators';

// Event Handlers
import { OnPaymentSucceededNotificationHandler } from './services/handlers/on-payment-succeeded-notification.handler';

/**
 * NotificationModule
 * 
 * Modern notification system with clean architecture:
 * - Channel Services: Handle specific communication channels (email, SMS, WhatsApp, push)
 * - Orchestrators: Coordinate multi-channel notifications for business flows
 * - Event Handlers: React to domain events and trigger notifications
 * 
 * All legacy services have been removed for a lean, maintainable codebase.
 */
@Module({
  imports: [ConfigModule, CqrsModule],
  providers: [
    // Channel Services
    EmailChannelService,
    SmsChannelService,
    WhatsAppChannelService,
    PushChannelService,

    // Orchestrators
    OrderNotificationOrchestrator,
    SubscriptionNotificationOrchestrator,

    // Event Handlers
    OnPaymentSucceededNotificationHandler,
  ],
  exports: [
    // Export channel services for direct use
    EmailChannelService,
    SmsChannelService,
    WhatsAppChannelService,
    PushChannelService,

    // Export orchestrators for business logic
    OrderNotificationOrchestrator,
    SubscriptionNotificationOrchestrator,
  ],
})
export class NotificationModule { }
