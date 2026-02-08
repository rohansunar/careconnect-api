import { Logger } from '@nestjs/common';
import { LedgerType, PaymentMode, PlatformFeeType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class LedgerFactory {
  private readonly logger = new Logger(LedgerFactory.name);

  constructor(private readonly tx: Prisma.TransactionClient) {}

  async createSaleEntry(params: {
    vendorId: string;
    orderItemId: string;
    amount: Decimal;
    paymentMode: PaymentMode;
  }) {
    return this.tx.ledger.create({
      data: {
        vendorId: params.vendorId,
        orderItemId: params.orderItemId,
        type: LedgerType.SALE,
        amount: params.amount,
        paymentMode: params.paymentMode,
      },
    });
  }

  async createPlatformFeeEntry(params: {
    vendorId: string;
    orderItemId: string;
    feeType: PlatformFeeType;
    amount: Decimal; // positive input
    paymentMode: PaymentMode;
  }) {
    if (params.amount.lte(0)) return;

    return this.tx.ledger.create({
      data: {
        vendorId: params.vendorId,
        orderItemId: params.orderItemId,
        type: LedgerType.PLATFORM_FEE,
        feeType: params.feeType,
        amount: params.amount.mul(-1), // 🔑 negative for vendor
        paymentMode: params.paymentMode,
      },
    });
  }

  async createRefundReversal(params: {
  vendorId: string;
  orderItemId: string;
  originalSaleAmount: Decimal;
  paymentMode: PaymentMode;
  }) {
    // Reverse SALE
    await this.tx.ledger.create({
      data: {
        vendorId: params.vendorId,
        orderItemId: params.orderItemId,
        type: LedgerType.REFUND,
        amount: params.originalSaleAmount.mul(-1),
        paymentMode: params.paymentMode,
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
        },
      });
    }
  }

}
