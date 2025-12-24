import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for order cancellation response
 */
export class CancelOrderResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the cancelled order',
    example: 'order-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Order number',
    example: 'O000001',
  })
  orderNo: string;

  @ApiProperty({
    description: 'Order status after cancellation',
    example: 'CANCELLED',
  })
  status: string;

  @ApiProperty({
    description: 'Payment status after cancellation',
    example: 'REFUNDED',
  })
  payment_status: string;

  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Customer requested cancellation due to change of plans',
  })
  cancelReason: string;

  @ApiProperty({
    description: 'Timestamp when the order was cancelled',
    example: '2023-12-01T10:30:00.000Z',
  })
  cancelledAt: Date;

  @ApiProperty({
    description: 'Customer information',
    example: {
      id: 'customer-uuid-123',
      name: 'John Doe',
      phone: '+1234567890',
    },
  })
  customer: {
    id: string;
    name: string;
    phone: string;
  };

  @ApiProperty({
    description: 'Vendor information',
    example: {
      id: 'vendor-uuid-456',
      name: 'Vendor Inc',
    },
  })
  vendor: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Order total amount',
    example: 50.0,
  })
  total_amount: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-12-01T10:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-12-01T10:30:00.000Z',
  })
  updated_at: Date;
}
