import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

/**
 * Data Transfer Object for creating a new order
 */
export class CreateOrderDto {
  /**
   * Unique identifier of the customer
   */
  @IsNotEmpty()
  @IsString()
  customerId?: string;

  /**
 * Unique identifier of the cart
 */
  @IsNotEmpty()
  @IsString()
  cartId?: string;

  /**
   * Unique identifier of the vendor
   */
  @IsNotEmpty()
  @IsString()
  vendorId?: string;

}