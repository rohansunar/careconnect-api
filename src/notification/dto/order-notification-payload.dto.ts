import { IsString, IsNumber, IsOptional } from 'class-validator';

/**
 * Data Transfer Object for order-specific push notification payloads.
 * Provides structured data for order-related notifications.
 */
export class OrderNotificationPayloadDto {
  /** Unique order identifier */
  @IsString()
  orderId: string;

  /** Human-readable order number */
  @IsString()
  orderNumber: string;

  /** Total order amount */
  @IsNumber()
  totalAmount: number;

  /** Currency code (e.g., 'INR') */
  @IsString()
  currency: string;

  /** Payment mode used for the order */
  @IsString()
  paymentMode: string;

  /** Vendor name for context */
  @IsOptional()
  @IsString()
  vendorName?: string;

  /** Estimated delivery time if available */
  @IsOptional()
  @IsString()
  estimatedDeliveryTime?: string;

  /** Number of items in the order */
  @IsOptional()
  @IsNumber()
  itemCount?: number;

  /** Creates an FCM data payload for the order notification.
   * @returns Record containing order details for FCM data payload
   */
  toDataPayload(): Record<string, string> {
    return {
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      totalAmount: this.totalAmount.toString(),
      currency: this.currency,
      paymentMode: this.paymentMode,
      ...(this.vendorName && { vendorName: this.vendorName }),
      ...(this.estimatedDeliveryTime && {
        estimatedDeliveryTime: this.estimatedDeliveryTime,
      }),
      ...(this.itemCount && { itemCount: this.itemCount.toString() }),
      notificationType: 'ORDER_CREATED',
      screen: 'Orders',
    };
  }
}
