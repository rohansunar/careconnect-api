import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

/**
 * Data Transfer Object for adding items to cart
 */
export class CreateCartItemDto {
  /**
   * Unique identifier of the product
   */
  @IsString()
  @IsNotEmpty()
  productId: string;

  /**
   * Quantity of the product to add to cart (must be > 0)
   */
  @IsNumber()
  @Min(1)
  quantity: number;
}
