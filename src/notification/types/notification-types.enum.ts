/**
 * Comprehensive enum for all notification types in the system
 *
 * This enum categorizes notifications by business flow:
 * - Order notifications (creation, cancellation, delivery status)
 * - Subscription notifications (lifecycle events)
 * - Edge case notifications (failures, retries, alerts)
 */

export enum NotificationType {
  // ========================================
  // Order Notifications - Customer
  // ========================================

  /** Email sent to customer when order is successfully created */
  ORDER_CREATED_CUSTOMER = 'ORDER_CREATED_CUSTOMER',

  /** Email sent to customer when order is cancelled */
  ORDER_CANCELLED_CUSTOMER = 'ORDER_CANCELLED_CUSTOMER',

  /** Push notification to customer when order is out for delivery */
  ORDER_OUT_FOR_DELIVERY_CUSTOMER = 'ORDER_OUT_FOR_DELIVERY_CUSTOMER',

  /** Push notification to customer when order is delivered */
  ORDER_DELIVERED_CUSTOMER = 'ORDER_DELIVERED_CUSTOMER',

  /** Email sent to customer when order is delivered */
  ORDER_DELIVERED_CUSTOMER_EMAIL = 'ORDER_DELIVERED_CUSTOMER_EMAIL',

  // ========================================
  // Order Notifications - Vendor
  // ========================================

  /** Email sent to vendor when new order is received */
  ORDER_CREATED_VENDOR = 'ORDER_CREATED_VENDOR',

  /** Email sent to vendor when order is delivered */
  ORDER_DELIVERED_VENDOR_EMAIL = 'ORDER_DELIVERED_VENDOR_EMAIL',

  /** Push notification to vendor when order is delivered */
  ORDER_DELIVERED_VENDOR_PUSH = 'ORDER_DELIVERED_VENDOR_PUSH',

  // ========================================
  // Order Notifications - Admin
  // ========================================

  /** Email sent to admin when order is delivered */
  ORDER_DELIVERED_ADMIN_EMAIL = 'ORDER_DELIVERED_ADMIN_EMAIL',

  /** Push notification to vendor when new order is received */
  ORDER_CREATED_VENDOR_PUSH = 'ORDER_CREATED_VENDOR_PUSH',

  /** Email sent to vendor when order is cancelled */
  ORDER_CANCELLED_VENDOR = 'ORDER_CANCELLED_VENDOR',

  /** Push notification to vendor when order is cancelled */
  ORDER_CANCELLED_VENDOR_PUSH = 'ORDER_CANCELLED_VENDOR_PUSH',

  // ========================================
  // Order Notifications - Admin
  // ========================================

  /** Email sent to admin when new order is created */
  ORDER_CREATED_ADMIN = 'ORDER_CREATED_ADMIN',

  // ========================================
  // Order Notifications - Rider
  // ========================================

  /** Push notification to rider when order is assigned */
  ORDER_ASSIGNED_RIDER = 'ORDER_ASSIGNED_RIDER',

  /** Push notification to rider when their assignment is reverted */
  ORDER_ASSIGNMENT_REVERTED_RIDER = 'ORDER_ASSIGNMENT_REVERTED_RIDER',

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

  /** Email sent when payment fails but order was created */
  PAYMENT_FAILED_ORDER_PENDING = 'PAYMENT_FAILED_ORDER_PENDING',

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

  /** High priority notifications that should be delivered quickly (e.g., order confirmations) */
  HIGH = 'HIGH',

  /** Normal priority notifications (e.g., renewal reminders) */
  NORMAL = 'NORMAL',

  /** Low priority notifications (e.g., marketing emails) */
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
