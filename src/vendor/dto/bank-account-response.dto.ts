import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for bank account response
 */
export class BankAccountResponseDto {
  /**
   * Bank account ID
   * @example 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8'
   */
  @ApiProperty({
    description: 'Bank account ID',
    example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8',
  })
  id: string;

  /**
   * Vendor ID
   * @example 'v1e2n3d4o5r6i7d8e9f0a1b2c3d4e5f6'
   */
  @ApiProperty({
    description: 'Vendor ID',
    example: 'v1e2n3d4o5r6i7d8e9f0a1b2c3d4e5f6',
  })
  vendorId: string;

  /**
   * Bank account number
   * @example '123456789012'
   */
  @ApiProperty({
    description: 'Bank account number',
    example: '123456789012',
  })
  accountNumber: string;

  /**
   * IFSC code of the bank
   * @example 'SBIN0001234'
   */
  @ApiProperty({
    description: 'IFSC code of the bank',
    example: 'SBIN0001234',
  })
  ifscCode: string;

  /**
   * Name of the bank
   * @example 'State Bank of India'
   */
  @ApiProperty({
    description: 'Name of the bank',
    example: 'State Bank of India',
  })
  bankName: string;

  /**
   * Name of the account holder
   * @example 'John Doe'
   */
  @ApiProperty({
    description: 'Name of the account holder',
    example: 'John Doe',
  })
  accountHolderName: string;

  /**
   * UPI ID (optional)
   * @example 'johndoe@sbi'
   */
  @ApiProperty({
    description: 'UPI ID (optional)',
    example: 'johndoe@sbi',
    required: false,
  })
  upiId?: string;

  /**
   * Whether this is the default bank account
   * @example false
   */
  @ApiProperty({
    description: 'Whether this is the default bank account',
    example: false,
  })
  isDefault: boolean;

  /**
   * Whether the bank account is verified
   * @example false
   */
  @ApiProperty({
    description: 'Whether the bank account is verified',
    example: false,
  })
  isVerified: boolean;

  /**
   * Creation timestamp
   * @example '2025-12-05T16:48:00.000Z'
   */
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-12-05T16:48:00.000Z',
  })
  createdAt: Date;

  /**
   * Last update timestamp
   * @example '2025-12-05T16:48:00.000Z'
   */
  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-12-05T16:48:00.000Z',
  })
  updatedAt: Date;
}
