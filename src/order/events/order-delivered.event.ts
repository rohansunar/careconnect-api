import { PaymentMode } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Event published when an order is delivered.
 * Used to trigger ledger entries for platform fees.
 */
export class OrderDeliveredEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNo: string,
    public readonly vendorId: string,
    public readonly orderItems: Array<{
      id: string;
      price: Decimal;
      quantity: number;
      product: { categoryId: string };
    }>,
    public readonly paymentMode: PaymentMode,
    public readonly deliveryTimestamp: Date,
  ) {}
}
