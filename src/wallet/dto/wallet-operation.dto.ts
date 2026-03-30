import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  IsEnum,
} from 'class-validator';

/**
 * Reference types for wallet transactions
 */
export enum ReferenceType {
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  REFUND = 'REFUND',
  BONUS = 'BONUS',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  WITHDRAWAL = 'WITHDRAWAL',
  DEPOSIT = 'DEPOSIT',
}

/**
 * DTO for deducting amount from customer wallet
 */
export class DeductFromWalletDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsEnum(ReferenceType)
  @IsOptional()
  referenceType?: ReferenceType;
}

/**
 * DTO for crediting amount to customer wallet
 */
export class CreditToWalletDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsEnum(ReferenceType)
  @IsOptional()
  referenceType?: ReferenceType;
}

/**
 * DTO for getting wallet by user ID
 */
export class GetWalletByUserIdDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

/**
 * Response DTO for wallet operations
 */
export class WalletOperationResponseDto {
  success: boolean;
  message: string;
  transactionId?: string;
  newBalance?: number;
}

/**
 * DTO for wallet balance response
 */
export class WalletBalanceDto {
  customerId: string;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}
