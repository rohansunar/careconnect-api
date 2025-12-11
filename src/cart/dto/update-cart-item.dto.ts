import { IsNumber, Min } from 'class-validator';

/**
 * Data Transfer Object for updating cart item quantity
 */
export class UpdateCartItemDto {
  /**
   * New quantity for the cart item (must be > 0)
   */
  @IsNumber()
  @Min(1)
  quantity: number;
}
