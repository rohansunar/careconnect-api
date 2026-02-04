import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

/**
 * Payment mode enum for order creation
 */
export enum PaymentMode {
  ONLINE = 'ONLINE',
  COD = 'COD',
  MONTHLY = 'MONTHLY',
}

/**
 * Data Transfer Object for creating an order from an existing cart.
 * This DTO is used when a customer checks out with items from their cart.
 */
export class CreateOrderFromCartDto {
  /**
   * Unique identifier of the cart to create order from
   */
  @ApiProperty({
    description: 'Unique identifier of the cart',
    example: 'cart_123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  cartId: string;

  /**
   * Payment mode for the order (ONLINE, COD, or MONTHLY)
   */
  @ApiProperty({
    enum: PaymentMode,
    description: 'Payment mode (ONLINE, COD, MONTHLY)',
    example: 'ONLINE',
  })
  @IsNotEmpty()
  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;
}
