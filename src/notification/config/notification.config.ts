/**
 * Centralized notification system configuration
 * 
 * This file contains all configurable parameters for the notification system including:
 * - Retry attempts and delays for each channel
 * - Rate limiting configuration
 * - Reminder schedules
 * - Timeout settings
 */

export const NOTIFICATION_CONFIG = {
  /**
   * Maximum retry attempts for each notification channel
   */
  retryAttempts: {
    email: 3,
    sms: 2,
    whatsapp: 2,
    push: 3,
  },

  /**
   * Delay in milliseconds before retrying failed notifications
   * Uses exponential backoff: delay * (2 ^ attemptNumber)
   */
  retryDelayMs: {
    email: 2000, // 2 seconds base delay
    sms: 1000, // 1 second base delay
    whatsapp: 1000, // 1 second base delay
    push: 1000, // 1 second base delay
  },

  /**
   * Rate limiting configuration to prevent API abuse
   */
  rateLimits: {
    sms: {
      maxPerMinute: 10,
      maxPerHour: 100,
      maxPerDay: 500,
    },
    whatsapp: {
      maxPerMinute: 10,
      maxPerHour: 100,
      maxPerDay: 500,
    },
    email: {
      maxPerMinute: 60,
      maxPerHour: 1000,
      maxPerDay: 10000,
    },
    push: {
      maxPerMinute: 100,
      maxPerHour: 5000,
      maxPerDay: 50000,
    },
  },

  /**
   * Reminder schedules for time-sensitive notifications
   */
  reminderSchedules: {
    subscriptionRenewal: {
      daysBefore: 3,
    },
    subscriptionExpiration: {
      daysBefore: 1,
    },
  },

  /**
   * Timeout settings for notification operations
   */
  timeouts: {
    emailSendMs: 10000, // 10 seconds
    smsSendMs: 5000, // 5 seconds
    whatsappSendMs: 5000, // 5 seconds
    pushSendMs: 5000, // 5 seconds
  },

  /**
   * Batch size limits for bulk notifications
   */
  batchSizes: {
    email: 50,
    sms: 100,
    whatsapp: 100,
    push: 500, // FCM limit
  },
} as const;

/**
 * Type for notification channel names
 */
export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push';
