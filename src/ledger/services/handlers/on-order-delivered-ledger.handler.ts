import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '@nestjs/cqrs';
import { PaymentMode, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/common/database/prisma.service';
import { OrderDeliveredEvent } from 'src/order/events/order-delivered.event';
import { LedgerFactory } from './ledger.factory';

/**
 * Fee name constants for platform fees
 * Using literal types for type safety
 */
const FEE_NAME = {
  PRODUCT_LISTING: 'PRODUCT_LISTING' as const,
};

/**
 * Query filter interface for platform fees
 */
interface PlatformFeeQueryFilter {
  categoryId: string;
  isActive: boolean;
  effectiveFrom: { lte: Date };
  feeName?: typeof FEE_NAME.PRODUCT_LISTING;
}

/**
 * Event handler that processes ledger entries when an order is delivered.
 * Records platform fees dynamically from PlatformFee table and sale entries.
 *
 * Design Principles Applied:
 * - Single Responsibility: Each method handles one concern
 * - KISS: Simple, readable code with early returns
 * - Loose Coupling: Uses LedgerFactory for ledger entry creation
 *
 * Key features:
 * - COD payments: Only creates PRODUCT_LISTING fee entry
 * - ONLINE payments: Creates all active platform fees from the database
 * - Supports both PERCENTAGE and FIXED calculation types
 * - Handles fee chaining (applyOnFeeCode) for dependent fees
 * - Implements idempotency to prevent duplicate entries
 */
@EventsHandler(OrderDeliveredEvent)
@Injectable()
export class OnOrderDeliveredLedgerHandler {
  private readonly logger = new Logger(OnOrderDeliveredLedgerHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main event handler - orchestrates the ledger entry creation process
   */
  async handle(event: OrderDeliveredEvent): Promise<void> {
    this.logger.log(
      `Processing ledger entries for delivered order ${event.orderNo}`,
    );

    // Early return for invalid input - KISS principle
    if (!event.orderId || event.orderItems.length === 0) {
      this.logger.warn(
        `Invalid order data for ledger processing: orderId=${event.orderId}`,
      );
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Create factory once per transaction - efficient resource usage
        const factory = new LedgerFactory(tx);
        const deliveryTimestamp = event.deliveryTimestamp;

        for (const item of event.orderItems) {
          // Check for existing entries (idempotency)
          const existingEntry = await tx.ledger.findFirst({
            where: { orderItemId: item.id, type: 'SALE' as any },
          });
          
          if (existingEntry) {
            this.logger.warn(
              `Ledger entries already exist for order item ${item.id}, skipping`,
            );
            continue;
          }

          const itemAmount = new Decimal(item.price).mul(item.quantity);
          
          // Fetch platform fees based on payment mode
          const queryFilter = this.buildFeeQueryFilter(
            event.paymentMode,
            item.product.categoryId,
            deliveryTimestamp,
          );

          const platformFees = await tx.platformFee.findMany({
            where: queryFilter,
          });

          // Log warning if no fees found
          if (platformFees.length === 0) {
            this.logger.warn(
              `No fees found for order ${event.orderNo} ` +
              `in category ${item.product.categoryId}. No platform fee will be charged.`,
            );
          }

          // Create SALE entry for ONLINE payments only
          if (event.paymentMode === PaymentMode.ONLINE) {
            await factory.createSaleEntry({
              vendorId: event.vendorId,
              orderItemId: item.id,
              feeType: 'SALE',
              amount: itemAmount,
              paymentMode: event.paymentMode,
              description: `Sale - Order delivered at ${deliveryTimestamp.toISOString()}`,
              deliveryTimestamp: deliveryTimestamp,
            });
          }

          // Process platform fees
          await this.processPlatformFees(
            event,
            item,
            factory,
            platformFees,
            itemAmount,
            deliveryTimestamp,
          );
        }
      });

      this.logger.log(
        `Ledger entries finalized for delivered order ${event.orderNo}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create ledger entries for order ${event.orderNo}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Builds the query filter based on payment mode
   * KISS: Simple conditional logic
   */
  private buildFeeQueryFilter(
    paymentMode: PaymentMode,
    categoryId: string,
    deliveryTimestamp: Date,
  ): PlatformFeeQueryFilter {
    const filter: PlatformFeeQueryFilter = {
      categoryId,
      isActive: true,
      effectiveFrom: { lte: deliveryTimestamp },
    };

    // COD: Only fetch PRODUCT_LISTING fee to prevent other fee types
    if (paymentMode === PaymentMode.COD) {
      filter.feeName = FEE_NAME.PRODUCT_LISTING;
    }

    return filter;
  }

  /**
   * Processes platform fees for an order item
   * Handles fee chaining and creates ledger entries
   */
  private async processPlatformFees(
    event: OrderDeliveredEvent,
    item: { id: string; price: Decimal; quantity: number; product: { categoryId: string } },
    factory: LedgerFactory,
    platformFees: Array<{
      feeName: string;
      value: Decimal;
      calculationType: 'PERCENTAGE' | 'FIXED';
      applyOnFeeCode: string | null;
    }>,
    itemAmount: Decimal,
    deliveryTimestamp: Date,
  ): Promise<void> {
    // Initialize fee results map for chaining
    const feeResults = new Map<string, Decimal>();
    feeResults.set('ORDER_TOTAL', itemAmount);

    for (const platformFee of platformFees) {
      const baseAmount = this.determineBaseAmount(
        platformFee.applyOnFeeCode,
        feeResults,
        itemAmount,
      );

      const feeAmount = this.calculateFee(platformFee, baseAmount);

      // Store result for potential chaining by other fees
      feeResults.set(platformFee.feeName, feeAmount);

      // Create platform fee entry if amount is positive
      if (feeAmount.gt(0)) {
        await factory.createPlatformFeeEntry({
          vendorId: event.vendorId,
          orderItemId: item.id,
          feeType: platformFee.feeName,
          amount: feeAmount,
          paymentMode: event.paymentMode,
          description: `${platformFee.feeName} - Order delivered at ${deliveryTimestamp.toISOString()}`,
          deliveryTimestamp: deliveryTimestamp,
        });
      }
    }
  }

  /**
   * Determines the base amount for fee calculation
   * Supports fee chaining via applyOnFeeCode
   */
  private determineBaseAmount(
    applyOnFeeCode: string | null,
    feeResults: Map<string, Decimal>,
    defaultAmount: Decimal,
  ): Decimal {
    if (!applyOnFeeCode) {
      return defaultAmount;
    }

    const chainedFee = feeResults.get(applyOnFeeCode);
    return chainedFee !== undefined ? chainedFee : defaultAmount;
  }

  /**
   * Calculates fee amount based on calculation type
   * Single Responsibility: Only handles fee calculation
   */
  private calculateFee(
    feeRecord: {
      value: Decimal;
      calculationType: 'PERCENTAGE' | 'FIXED';
    },
    baseAmount: Decimal,
  ): Decimal {
    if (feeRecord.calculationType === 'PERCENTAGE') {
      return baseAmount.mul(feeRecord.value).div(100);
    }
    // FIXED type - return as-is (applied once per order item)
    return feeRecord.value;
  }
}
