import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for creating a new payment
 */
export class CreatePaymentDto {
  /**
   * Unique identifier of the cart
   */
  @IsNotEmpty()
  @IsString()
  cartId: string;

  /**
   * Payment mode (ONLINE, CASH, etc.)
   */
  @IsOptional()
  @IsString()
  paymentMode?: string;
}
