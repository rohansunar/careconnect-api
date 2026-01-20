import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum PaymentMode {
  ONLINE = 'ONLINE',
  COD = 'COD',
  MONTHLY = 'MONTHLY',
}
/**
 * Data Transfer Object for creating a new payment
 */
export class CreatePaymentDto {
  @ApiPropertyOptional({
    enum: PaymentMode,
    description: 'Unique identifier of the cart',
  })
  @IsNotEmpty()
  @IsString()
  cartId: string;

  @ApiPropertyOptional({
    enum: PaymentMode,
    description: 'Payment mode (ONLINE, CASH, MONTHLY.)',
  })
  @IsNotEmpty()
  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;
}
