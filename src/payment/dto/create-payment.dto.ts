import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for creating a new payment
 */
export class CreatePaymentDto {
  /**
   * Unique identifier of the order
   */
  @IsNotEmpty()
  @IsString()
  orderId: string;

  /**
   * Payment mode (ONLINE, CASH, etc.)
   */
  @IsOptional()
  @IsString()
  paymentMode?: string;
}