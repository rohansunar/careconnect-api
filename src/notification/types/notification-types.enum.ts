/**
 * Comprehensive enum for all notification types in the system
 *
 * This enum categorizes notifications by business flow:
 * - Subscription notifications (lifecycle events)
 * - Edge case notifications (failures, retries, alerts)
 */

export enum NotificationType {
  // ========================================
  // Subscription Notifications
  // ========================================

  /** Email sent to customer when subscription is first created */
  SUBSCRIPTION_CONFIRMED = 'SUBSCRIPTION_CONFIRMED',

  /** Email sent to customer when subscription payment succeeds and becomes active */
  SUBSCRIPTION_ACTIVATED = 'SUBSCRIPTION_ACTIVATED',

  /** Email sent to customer before subscription renewal (3 days before) */
  SUBSCRIPTION_RENEWAL_REMINDER = 'SUBSCRIPTION_RENEWAL_REMINDER',

  /** Email sent to customer when subscription expires or is cancelled */
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',

  /** Email sent to customer when subscription renewal payment fails */
  SUBSCRIPTION_PAYMENT_FAILED = 'SUBSCRIPTION_PAYMENT_FAILED',

  // ========================================
  // Edge Case Notifications
  // ========================================

  /** Alert sent to admin when rider assignment fails */
  RIDER_ASSIGNMENT_FAILED = 'RIDER_ASSIGNMENT_FAILED',

  /** Alert when email delivery fails (for monitoring) */
  EMAIL_DELIVERY_FAILED = 'EMAIL_DELIVERY_FAILED',

  /** Alert when push notification delivery fails (for monitoring) */
  PUSH_DELIVERY_FAILED = 'PUSH_DELIVERY_FAILED',

  /** Alert when SMS delivery fails (for monitoring) */
  SMS_DELIVERY_FAILED = 'SMS_DELIVERY_FAILED',

  /** Alert when WhatsApp delivery fails (for monitoring) */
  WHATSAPP_DELIVERY_FAILED = 'WHATSAPP_DELIVERY_FAILED',
}

/**
 * Notification priority levels
 * Used to determine retry behavior and alerting
 */
export enum NotificationPriority {
  /** Critical notifications that require immediate delivery (e.g., payment confirmations) */
  CRITICAL = 'CRITICAL',

  /** High priority notifications that should be delivered quickly */
  HIGH = 'HIGH',

  /** Normal priority notifications (e.g., renewal reminders) */
  NORMAL = 'NORMAL',

  /** Low priority notifications */
  LOW = 'LOW',
}

/**
 * Notification status for tracking delivery
 */
export enum NotificationStatus {
  /** Notification is queued for sending */
  PENDING = 'PENDING',

  /** Notification is currently being sent */
  SENDING = 'SENDING',

  /** Notification was successfully delivered */
  SENT = 'SENT',

  /** Notification failed but will be retried */
  FAILED_RETRYING = 'FAILED_RETRYING',

  /** Notification failed permanently after all retries */
  FAILED = 'FAILED',

  /** Notification was skipped (e.g., user preferences) */
  SKIPPED = 'SKIPPED',
}
