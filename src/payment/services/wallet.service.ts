import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  WalletTransactionType,
  TransactionStatus,
  ReferenceType,
} from '@prisma/client';

/**
 * Data transfer object for crediting wallet
 */
export interface CreditWalletData {
  customerId: string;
  amount: number;
  referenceId?: string;
  referenceType?: ReferenceType;
  description?: string;
  idempotencyKey?: string;
}

/**
 * Service for managing customer wallet operations.
 * Handles wallet balance updates and transaction logging.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Credits the customer's wallet with the specified amount.
   * Creates a transaction log entry for the credit.
   * Uses database transaction to ensure atomicity.
   *
   * @param data - Credit wallet data including customer ID, amount, and optional reference
   * @returns The updated wallet balance
   * @throws NotFoundException - If customer or wallet not found
   * @throws BadRequestException - If amount is invalid or idempotent operation fails
   */
  async creditWallet(data: CreditWalletData): Promise<{ balance: number }> {
    const {
      customerId,
      amount,
      referenceId,
      referenceType,
      description,
      idempotencyKey,
    } = data;

    // Validate input
    if (!customerId) {
      throw new BadRequestException('Customer ID is required');
    }
    if (amount === undefined || amount === null || amount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    this.logger.log(
      `Crediting wallet for customer ${customerId} with amount: ${amount}`,
    );

    try {
      // Check if idempotency key already exists to prevent duplicate credits
      if (idempotencyKey) {
        const existingTransaction =
          await this.prisma.walletTransaction.findUnique({
            where: { idempotencyKey },
          });
        if (existingTransaction) {
          this.logger.warn(
            `Duplicate transaction detected for idempotency key: ${idempotencyKey}`,
          );
          // Return existing wallet balance
          const wallet = await this.prisma.customerWallet.findUnique({
            where: { customerId },
          });
          return { balance: wallet?.balance.toNumber() || 0 };
        }
      }

      // Use transaction to ensure atomicity of wallet update and transaction log
      const result = await this.prisma.$transaction(async (tx) => {
        // Get or create wallet for customer
        let wallet = await tx.customerWallet.findUnique({
          where: { customerId },
        });

        if (!wallet) {
          this.logger.log(`Creating new wallet for customer: ${customerId}`);
          wallet = await tx.customerWallet.create({
            data: {
              customerId,
              balance: amount,
            },
          });
        } else {
          // Update existing wallet balance
          wallet = await tx.customerWallet.update({
            where: { id: wallet.id },
            data: {
              balance: {
                increment: amount,
              },
            },
          });
        }

        // Create transaction log entry
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: WalletTransactionType.CREDIT,
            status: TransactionStatus.COMPLETED,
            referenceId,
            referenceType: referenceType || ReferenceType.SUBSCRIPTION,
            description:
              description || 'Wallet credit for subscription payment',
            idempotencyKey,
            completedAt: new Date(),
          },
        });

        return wallet;
      });

      this.logger.log(
        `Wallet credited successfully. New balance: ${result.balance.toNumber()}`,
      );

      return { balance: result.balance.toNumber() };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to credit wallet for customer ${customerId}: ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException(`Failed to credit wallet: ${errorMessage}`);
    }
  }

  /**
   * Retrieves the wallet balance for a customer.
   *
   * @param customerId - The customer ID
   * @returns The wallet balance
   * @throws NotFoundException - If wallet not found
   */
  async getBalance(customerId: string): Promise<{ balance: number }> {
    const wallet = await this.prisma.customerWallet.findUnique({
      where: { customerId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found for customer');
    }

    return { balance: wallet.balance.toNumber() };
  }

  /**
   * Retrieves wallet transaction history for a customer.
   *
   * @param customerId - The customer ID
   * @param limit - Maximum number of transactions to return
   * @param offset - Number of transactions to skip
   * @returns Array of wallet transactions
   */
  async getTransactions(
    customerId: string,
    limit = 10,
    offset = 0,
  ): Promise<{ transactions: any[]; total: number }> {
    const wallet = await this.prisma.customerWallet.findUnique({
      where: { customerId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found for customer');
    }

    const total = await this.prisma.walletTransaction.count({
      where: { walletId: wallet.id },
    });

    return {
      transactions: wallet.transactions.map((t) => ({
        ...t,
        amount: t.amount.toNumber(),
      })),
      total,
    };
  }
}
