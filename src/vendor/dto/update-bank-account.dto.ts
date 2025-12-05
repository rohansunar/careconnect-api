import { IsString, IsOptional, Matches, Length } from 'class-validator';

/**
 * Data Transfer Object for updating a vendor bank account
 */
export class UpdateBankAccountDto {
  /**
   * Bank account number
   * @example '123456789012'
   */
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{9,18}$/, {
    message: 'Account number must be 9 to 18 digits',
  })
  accountNumber?: string;

  /**
   * IFSC code of the bank
   * @example 'SBIN0001234'
   */
  @IsOptional()
  @IsString()
  @Length(11, 11, {
    message: 'IFSC code must be exactly 11 characters',
  })
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'IFSC code must be in valid format (e.g., SBIN0001234)',
  })
  ifscCode?: string;

  /**
   * Name of the bank
   * @example 'State Bank of India'
   */
  @IsOptional()
  @IsString()
  bankName?: string;

  /**
   * Name of the account holder
   * @example 'John Doe'
   */
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  /**
   * UPI ID (optional)
   * @example 'johndoe@sbi'
   */
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/, {
    message: 'UPI ID must be in valid format (e.g., username@bank)',
  })
  upiId?: string;

  /**
   * Whether this should be the default bank account
   * @example false
   */
  @IsOptional()
  isDefault?: boolean;
}
