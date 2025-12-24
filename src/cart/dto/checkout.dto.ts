import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for checkout preview request
 */
export class CheckoutRequestDto {
  /**
   * Unique identifier of the delivery address
   */
  @ApiProperty({
    description: 'Unique identifier of the delivery address',
    example: 'addr_123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  addressId: string;
}

/**
 * Individual cart item in preview
 */
export class CheckoutItemDto {
  /**
   * Unique identifier of the cart item
   */
  @ApiProperty({
    description: 'Unique identifier of the cart item',
    example: 'item_123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  id: string;

  /**
   * Product information
   */
  @ApiProperty({
    description: 'Product information',
    example: {
      id: 'prod_123e4567-e89b-12d3-a456-426614174000',
      name: '20L Water Jar',
      images: ['https://example.com/water-jar.jpg'],
      description: 'Pure drinking water jar',
    },
  })
  @IsNotEmpty()
  product: {
    id: string;
    name: string;
    images: string[];
    description?: string;
  };

  /**
   * Quantity of the product
   */
  @ApiProperty({
    description: 'Quantity of the product',
    example: 2,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  /**
   * Price per unit at time of adding to cart
   */
  @ApiProperty({
    description: 'Price per unit',
    example: 50.0,
  })
  @IsNumber()
  price: number;

  /**
   * Deposit amount per unit
   */
  @ApiPropertyOptional({
    description: 'Deposit amount per unit',
    example: 100.0,
  })
  @IsOptional()
  @IsNumber()
  deposit?: number;

  /**
   * Total amount for this item (price * quantity)
   */
  @ApiProperty({
    description: 'Total amount for this item',
    example: 100.0,
  })
  @IsNumber()
  totalPrice: number;

  /**
   * Total deposit for this item (deposit * quantity)
   */
  @ApiPropertyOptional({
    description: 'Total deposit for this item',
    example: 200.0,
  })
  @IsOptional()
  @IsNumber()
  totalDeposit?: number;
}

/**
 * Vendor group in preview
 */
export class CheckoutVendorDto {
  /**
   * Vendor information
   */
  @ApiProperty({
    description: 'Vendor information',
    example: {
      id: 'vendor_123e4567-e89b-12d3-a456-426614174000',
      name: 'Water Supplier Co.',
      vendorNo: 'VND001',
    },
  })
  @IsNotEmpty()
  vendor: {
    id: string;
    name: string;
    vendorNo: string;
  };

  /**
   * Items from this vendor
   */
  @ApiProperty({
    description: 'Items from this vendor',
    type: [CheckoutItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  /**
   * Subtotal for this vendor's items
   */
  @ApiProperty({
    description: 'Subtotal for this vendor',
    example: 250.0,
  })
  @IsNumber()
  vendorSubtotal: number;

  /**
   * Total deposit for this vendor's items
   */
  @ApiPropertyOptional({
    description: 'Total deposit for this vendor',
    example: 400.0,
  })
  @IsOptional()
  @IsNumber()
  vendorTotalDeposit?: number;
}

/**
 * Data Transfer Object for checkout preview response
 */
export class CheckoutResponseDto {
  /**
   * Unique identifier of the cart
   */
  @ApiProperty({
    description: 'Unique identifier of the cart',
    example: 'cart_123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  cartId: string;

  /**
   * Delivery address information
   */
  @ApiProperty({
    description: 'Delivery address information',
    example: {
      id: 'addr_123e4567-e89b-12d3-a456-426614174000',
      label: 'Home',
      address: '123 Main Street, Apartment 4B',
      city: 'Mumbai',
      pincode: '400001',
    },
  })
  @IsNotEmpty()
  deliveryAddress: {
    id: string;
    label?: string;
    address?: string;
    city?: string;
    pincode?: string;
  };

  /**
   * Whether the delivery address is valid for all vendors
   */
  @ApiProperty({
    description: 'Whether the delivery address is valid for all vendors',
    example: true,
  })
  @IsNotEmpty()
  isAddressValid: boolean;

  /**
   * Array of vendor groups with their items
   */
  @ApiProperty({
    description: 'Array of vendor groups with their items',
    type: [CheckoutVendorDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutVendorDto)
  vendors: CheckoutVendorDto[];

  /**
   * Total number of items in cart
   */
  @ApiProperty({
    description: 'Total number of items in cart',
    example: 5,
  })
  @IsNumber()
  totalItems: number;

  /**
   * Overall subtotal (sum of all item prices)
   */
  @ApiProperty({
    description: 'Overall subtotal',
    example: 500.0,
  })
  @IsNumber()
  subtotal: number;

  /**
   * Overall total deposit amount
   */
  @ApiPropertyOptional({
    description: 'Overall total deposit amount',
    example: 800.0,
  })
  @IsOptional()
  @IsNumber()
  totalDeposit?: number;

  /**
   * Grand total (subtotal + total deposit)
   */
  @ApiProperty({
    description: 'Grand total',
    example: 1300.0,
  })
  @IsNumber()
  grandTotal: number;

  /**
   * Delivery notes or warnings
   */
  @ApiPropertyOptional({
    description: 'Delivery notes or warnings',
    example: 'Some vendors may have delivery restrictions to this address',
  })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}
