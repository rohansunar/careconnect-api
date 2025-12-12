import {
  IsString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

/**
 * Data Transfer Object for updating an order
 */
export class UpdateOrderDto {
  /**
   * Unique identifier of the customer
   */
  @IsOptional()
  @IsString()
  customer_id?: string;

  /**
   * Unique identifier of the vendor
   */
  @IsOptional()
  @IsString()
  vendor_id?: string;

  /**
   * Unique identifier of the delivery address
   */
  @IsOptional()
  @IsString()
  address_id?: string;

  /**
   * Unique identifier of the product
   */
  @IsOptional()
  @IsString()
  product_id?: string;

  /**
   * Quantity of the product (must be > 0 if provided)
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  qty?: number;

  /**
   * Total amount for the order
   */
  @IsOptional()
  @IsNumber()
  total_amount?: number;

  /**
   * Status of the order
   */
  @IsOptional()
  @IsString()
  status?: string;

  /**
   * Payment status of the order
   */
  @IsOptional()
  @IsString()
  payment_status?: string;

  /**
   * Assigned rider's phone number
   */
  @IsOptional()
  @IsString()
  assigned_rider_phone?: string;
}