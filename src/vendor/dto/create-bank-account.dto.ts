import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  Length,
} from 'class-validator';

/**
 * Data Transfer Object for creating a vendor bank account
 */
export class CreateBankAccountDto {
  /**
   * Bank account number
   * @example '123456789012'
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{9,18}$/, {
    message: 'Account number must be 9 to 18 digits',
  })
  accountNumber: string;

  /**
   * IFSC code of the bank
   * @example 'SBIN0001234'
   */
  @IsString()
  @IsNotEmpty()
  ifscCode: string;

  /**
   * Name of the bank
   * @example 'State Bank of India'
   */
  @IsString()
  @IsNotEmpty()
  bankName: string;

  /**
   * Name of the account holder
   * @example 'John Doe'
   */
  @IsString()
  @IsNotEmpty()
  accountHolderName: string;

  /**
   * UPI ID (optional)
   * @example 'johndoe@sbi'
   */
  @IsOptional()
  @IsString()
  upiId?: string;

  /**
   * Whether this should be the default bank account
   * @example false
   */
  @IsOptional()
  @IsNotEmpty()
  isDefault?: boolean;
}
