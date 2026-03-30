import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  DeductFromWalletDto,
  CreditToWalletDto,
  WalletBalanceDto,
} from '../dto/wallet-operation.dto';

/**
 * Custom error for insufficient wallet balance
 */
export class InsufficientBalanceError extends Error {
  constructor(
    userId: string,
    requestedAmount: number,
    availableBalance: number,
  ) {
    super(
      `Insufficient balance for user ${userId}. Requested: ${requestedAmount}, Available: ${availableBalance}`,
    );
    this.name = 'InsufficientBalanceError';
  }
}

/**
 * Custom error for duplicate transaction (idempotency violation)
 */
export class DuplicateTransactionError extends Error {
  constructor(idempotencyKey: string) {
    super(
      `Duplicate transaction detected for idempotency key: ${idempotencyKey}`,
    );
    this.name = 'DuplicateTransactionError';
  }
}

/**
 * Custom error for wallet not found
 */
export class WalletNotFoundError extends Error {
  constructor(userId: string) {
    super(`Wallet not found for user: ${userId}`);
    this.name = 'WalletNotFoundError';
  }
}

/**
 * Service for managing user wallet operations
 * Handles credit, debit, and balance retrieval with proper atomicity
 */
@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deduct amount from user wallet
   * Uses Prisma transaction for atomicity
   * @param userId - User ID
   * @param amount - Amount to deduct
   * @param orderId - Optional order ID for reference
   * @param description - Optional description
   * @param idempotencyKey - Optional key for idempotency
   * @param referenceType - Optional reference type
   * @returns Transaction details and new balance
   */
  async deductFromWallet(
    userId: string,
    amount: number,
    orderId?: string,
    description?: string,
    idempotencyKey?: string,
    referenceType?: string,
  ): Promise<{ transactionId: string; newBalance: Decimal }> {
    // Check for duplicate transaction if idempotency key provided
    if (idempotencyKey) {
      const existingTransaction = await this.prisma.walletTransaction.findFirst(
        {
          where: {
            wallet: { customerId: userId },
            idempotencyKey,
          },
        },
      );

      if (existingTransaction) {
        throw new DuplicateTransactionError(idempotencyKey);
      }
    }

    // Use Prisma transaction for atomic operation
    const result = await this.prisma.$transaction(async (tx) => {
      // Get wallet with lock for update
      const wallet = await tx.customerWallet.findUnique({
        where: { customerId: userId },
        select: { id: true, balance: true },
      });

      if (!wallet) {
        throw new WalletNotFoundError(userId);
      }

      // Convert amount to Decimal for precise comparison
      const amountDecimal = new Decimal(amount);
      const currentBalance = wallet.balance as unknown as Decimal;

      // Check sufficient balance
      if (currentBalance.lessThan(amountDecimal)) {
        throw new InsufficientBalanceError(
          userId,
          amount,
          parseFloat(currentBalance.toString()),
        );
      }

      // Calculate new balance
      const newBalance = currentBalance.minus(amountDecimal);

      // Update wallet balance
      await tx.customerWallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: amountDecimal,
          type: 'DEBIT',
          status: 'COMPLETED',
          referenceId: orderId,
          referenceType: referenceType as any,
          description,
          idempotencyKey,
          completedAt: new Date(),
        },
      });

      return {
        transactionId: transaction.id,
        newBalance,
      };
    });

    return result;
  }

  /**
   * Credit amount to user wallet
   * Uses Prisma transaction for atomicity
   * @param userId - User ID
   * @param amount - Amount to credit
   * @param orderId - Optional order ID for reference
   * @param description - Optional description
   * @param idempotencyKey - Optional key for idempotency
   * @param referenceType - Optional reference type
   * @returns Transaction details and new balance
   */
  async creditToWallet(
    userId: string,
    amount: number,
    orderId?: string,
    description?: string,
    idempotencyKey?: string,
    referenceType?: string,
  ): Promise<{ transactionId: string; newBalance: Decimal }> {
    if (idempotencyKey) {
      const existingTransaction = await this.prisma.walletTransaction.findFirst(
        {
          where: {
            wallet: { customerId: userId },
            idempotencyKey,
          },
        },
      );

      if (existingTransaction) {
        throw new DuplicateTransactionError(idempotencyKey);
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let wallet = await tx.customerWallet.findUnique({
        where: { customerId: userId },
        select: { id: true, balance: true },
      });

      if (!wallet) {
        wallet = await tx.customerWallet.create({
          data: {
            customerId: userId,
            balance: 0,
          },
          select: { id: true, balance: true },
        });
      }

      // Convert amount to Decimal for precise addition
      const amountDecimal = new Decimal(amount);
      const currentBalance = wallet.balance as unknown as Decimal;

      // Calculate new balance
      const newBalance = currentBalance.plus(amountDecimal);

      // Update wallet balance
      await tx.customerWallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: amountDecimal,
          type: 'CREDIT',
          status: 'COMPLETED',
          referenceId: orderId,
          referenceType: referenceType as any,
          description,
          idempotencyKey,
          completedAt: new Date(),
        },
      });

      return {
        transactionId: transaction.id,
        newBalance,
      };
    });

    return result;
  }

  /**
   * Get wallet by user ID
   * @param userId - User ID
   * @returns Wallet balance details
   */
  async getWalletByUserId(userId: string): Promise<WalletBalanceDto> {
    const wallet = await this.prisma.customerWallet.findUnique({
      where: { customerId: userId },
      select: {
        customerId: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!wallet) {
      return {
        customerId: userId,
        balance: 0,
        currency: 'INR',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      customerId: wallet.customerId,
      balance: parseFloat((wallet.balance as unknown as Decimal).toString()),
      currency: 'INR',
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * Get wallet transaction history for a user
   * @param userId - User ID
   * @param limit - Number of transactions to retrieve
   * @param offset - Offset for pagination
   * @returns Array of wallet transactions
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<any[]> {
    const wallet = await this.prisma.customerWallet.findUnique({
      where: { customerId: userId },
      select: { id: true },
    });

    if (!wallet) {
      return [];
    }

    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
