import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

/**
 * Subscription status enum
 */
export enum SubscriptionNotificationStatus {
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  RENEWAL_REMINDER = 'RENEWAL_REMINDER',
  EXPIRED = 'EXPIRED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

/**
 * DTO for subscription notifications
 * Covers all subscription lifecycle events:
 * - Confirmation (after creation)
 * - Activation (after payment success)
 * - Renewal reminder (3 days before)
 * - Expiration
 * - Payment failure
 */
export class SubscriptionNotificationDto {
  @IsString()
  subscriptionId: string;

  @IsString()
  customerName: string;

  @IsString()
  customerEmail: string;

  @IsString()
  productName: string;

  @IsString()
  frequency: string;

  @IsString()
  @IsOptional()
  nextDeliveryDate?: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  formattedAmount: string;

  @IsEnum(SubscriptionNotificationStatus)
  status: SubscriptionNotificationStatus;

  @IsString()
  @IsOptional()
  renewalDate?: string;

  @IsString()
  @IsOptional()
  expirationDate?: string;

  @IsString()
  @IsOptional()
  paymentFailureReason?: string;

  @IsString()
  @IsOptional()
  retryDate?: string;

  @IsString()
  @IsOptional()
  gracePeriodEndDate?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}
