# Notification System Documentation

## Overview

The Notification System is a robust, modular, and channel-based architecture designed to handle all communication needs of the application. It supports multiple channels (Email, SMS, WhatsApp, Push).

## Key Features

- **Multi-Channel Support**: Dedicated services for Email (Resend), SMS (Twilio), WhatsApp (Twilio), and Push (FCM).
- **Channel Services**: Pure delivery mechanisms responsible for sending messages to external providers.
- **Resilience**: Built-in retry mechanisms with exponential backoff for all channels.
- **Type Safety**: Fully typed DTOs and enums for all notification payloads.
- **Template Engine**: React-based email templates using `@react-email/components`.
- **Clean Architecture**: Separation of concerns between channel delivery and event handling.

## Architecture

The system is built on channel services:

- **Channel Services** (`/services/channels`): Pure delivery mechanisms responsible for sending messages to external providers.

## Code Structure

```
src/notification/
├── dto/                    # Data Transfer Objects for type safety
├── services/
│   └── channels/           # Delivery services (Email, SMS, Push, WhatsApp)
├── types/                  # Enums and interfaces
└── notification.module.ts  # Main module definition
```

## Supported Channels

| Channel | Provider | Description |
|---------|----------|-------------|
| Email | Resend | Transactional emails |
| SMS | Twilio | SMS notifications |
| WhatsApp | Twilio | WhatsApp messages |
| Push | Firebase | Mobile push notifications |

## Configuration

Configuration is managed in `config/notification.config.ts`.

- **Retries**: Default 3 per channel.
- **Rate Limits**: Configurable per channel.
- **Timeouts**: 5000ms default.

## Testing

The system is designed for easy testing:
- **Unit Tests**: Mock Channel Services to test notification logic.
- **Integration Tests**: Mock external providers (Resend, Twilio) to test Channel Services.

---
*Maintained by the Backend Team. Last Updated: Mar 2026*