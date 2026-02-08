import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

/**
 * Enum for order confirmation notification types.
 * Distinguishes between vendor and admin order confirmation notifications.
 */
export enum OrderConfirmationNotificationType {
  /** Notification sent to vendor when order is confirmed */
  VENDOR_ORDER_CONFIRMATION = 'VENDOR_ORDER_CONFIRMATION',
  /** Notification sent to admin when order is confirmed */
  ADMIN_ORDER_CONFIRMATION = 'ADMIN_ORDER_CONFIRMATION',
}

/**
 * Data Transfer Object for order confirmation notification payloads.
 * Contains only order confirmation fields - NO payment fees, transaction details, or financial data.
 * Used for FCM push notifications and email templates.
 */
export class OrderConfirmationNotificationPayloadDto {
  /** Unique order identifier */
  @IsString()
  orderId: string;

  /** Human-readable order number */
  @IsString()
  orderNumber: string;

  /** Customer name for personalization */
  @IsOptional()
  @IsString()
  customerName?: string;

  /** Customer email for notification routing */
  @IsOptional()
  @IsString()
  customerEmail?: string;

  /** Total number of items in the order */
  @IsOptional()
  @IsNumber()
  itemCount?: number;

  /** Total order amount (numeric value) */
  @IsNumber()
  totalAmount: number;

  /** Currency code (e.g., 'INR') */
  @IsString()
  currency: string;

  /** Formatted amount string with currency symbol (e.g., '₹500.00') */
  @IsString()
  formattedAmount: string;

  /** Payment mode used for the order (e.g., 'ONLINE', 'CASH_ON_DELIVERY') */
  @IsString()
  paymentMode: string;

  /** Estimated delivery time in human-readable format */
  @IsOptional()
  @IsString()
  estimatedDeliveryTime?: string;

  /** Delivery address for the order */
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  /** Order date in ISO 8601 format */
  @IsString()
  orderDate: string;

  /** Type of order confirmation notification */
  @IsEnum(OrderConfirmationNotificationType)
  notificationType: OrderConfirmationNotificationType;

  /** Vendor name for email templates */
  @IsOptional()
  @IsString()
  vendorName?: string;

  /** Dashboard URL for vendor email template */
  @IsOptional()
  @IsString()
  dashboardUrl?: string;

  /** Admin dashboard URL for admin email template */
  @IsOptional()
  @IsString()
  adminDashboardUrl?: string;

  /**
   * Creates an FCM data payload for push notifications.
   * Converts the DTO to a flat record for FCM transmission.
   * @returns Record containing order confirmation details for FCM data payload
   */
  toDataPayload(): Record<string, string> {
    return {
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      totalAmount: this.totalAmount.toString(),
      currency: this.currency,
      formattedAmount: this.formattedAmount,
      paymentMode: this.paymentMode,
      orderDate: this.orderDate,
      notificationType: this.notificationType,
      ...(this.customerName && { customerName: this.customerName }),
      ...(this.itemCount && { itemCount: this.itemCount.toString() }),
      ...(this.estimatedDeliveryTime && {
        estimatedDeliveryTime: this.estimatedDeliveryTime,
      }),
      ...(this.deliveryAddress && { deliveryAddress: this.deliveryAddress }),
      screen: 'OrderDetails',
    };
  }

  /**
   * Creates template variables for email notifications.
   * Converts the DTO to a key-value object for email template rendering.
   * @returns Record containing template variables for email rendering
   */
  toEmailTemplateVars(): Record<string, string | number | undefined> {
    return {
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      customerName: this.customerName ?? '',
      customerEmail: this.customerEmail ?? '',
      itemCount: this.itemCount ?? 0,
      totalAmount: this.totalAmount,
      formattedAmount: this.formattedAmount,
      currency: this.currency,
      paymentMode: this.paymentMode,
      estimatedDeliveryTime: this.estimatedDeliveryTime ?? '',
      deliveryAddress: this.deliveryAddress ?? '',
      orderDate: this.orderDate,
      notificationType: this.notificationType,
      vendorName: this.vendorName ?? '',
      dashboardUrl: this.dashboardUrl ?? '',
      adminDashboardUrl: this.adminDashboardUrl ?? '',
    };
  }
}
