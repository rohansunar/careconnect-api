import { Logger } from '@nestjs/common';
import { LedgerType, PaymentMode, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class LedgerFactory {
  private readonly logger = new Logger(LedgerFactory.name);

  constructor(private readonly tx: Prisma.TransactionClient) {}

  async createSaleEntry(params: {
    vendorId: string;
    orderItemId: string;
    feeType: string;
    amount: Decimal;
    paymentMode: PaymentMode;
    description?: string;
    deliveryTimestamp?: Date;
  }) {
    await this.tx.ledger.create({
      data: {
        vendorId: params.vendorId,
        orderItemId: params.orderItemId,
        type: LedgerType.SALE,
        feeType: params.feeType,
        amount: params.amount,
        paymentMode: params.paymentMode,
        description: params.description,
        deliveryTimestamp: params.deliveryTimestamp,
      },
    });

    return this.tx.vendorBalance.update({
      where: { vendorId: params.vendorId },
      data: {
        availableBalance: { increment: params.amount },
      },
    });
  }

  async createPlatformFeeEntry(params: {
    vendorId: string;
    orderItemId: string;
    feeType: string;
    amount: Decimal; // positive input
    paymentMode: PaymentMode;
    description?: string;
    deliveryTimestamp?: Date;
  }) {
    if (params.amount.lte(0)) return;

    await this.tx.ledger.create({
      data: {
        vendorId: params.vendorId,
        orderItemId: params.orderItemId,
        type: LedgerType.PLATFORM_FEE,
        feeType: params.feeType,
        amount: params.amount.mul(-1), // 🔑 negative for vendor
        paymentMode: params.paymentMode,
        description: params.description,
        deliveryTimestamp: params.deliveryTimestamp,
      },
    });
    return this.tx.vendorBalance.update({
      where: { vendorId: params.vendorId },
      data: {
        availableBalance: { decrement: params.amount },
      },
    });
  }

  async createRefundReversal(params: {
    vendorId: string;
    orderItemId: string;
    feeType: string;
    originalSaleAmount: Decimal;
    paymentMode: PaymentMode;
    description?: string;
  }) {
    // Reverse SALE
    await this.tx.ledger.create({
      data: {
        vendorId: params.vendorId,
        orderItemId: params.orderItemId,
        type: LedgerType.REFUND,
        feeType: params.feeType,
        amount: params.originalSaleAmount.mul(-1),
        paymentMode: params.paymentMode,
        description: params.description,
      },
    });

    // Reverse platform fees (refund to vendor)
    const fees = await this.tx.ledger.findMany({
      where: {
        orderItemId: params.orderItemId,
        type: LedgerType.PLATFORM_FEE,
      },
    });

    for (const fee of fees) {
      await this.tx.ledger.create({
        data: {
          vendorId: params.vendorId,
          orderItemId: params.orderItemId,
          type: LedgerType.REFUND,
          feeType: fee.feeType,
          amount: fee.amount.abs(), // reverse negative → positive
          paymentMode: params.paymentMode,
          description: `Reversal of ${fee.feeType}`,
        },
      });
    }
  }
}
