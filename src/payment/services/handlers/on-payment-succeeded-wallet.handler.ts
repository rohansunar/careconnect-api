import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../common/database/prisma.service';
import { ReferenceType } from '@prisma/client';
import { PaymentSucceededEvent } from '../payment-succeeded.event';
import { WalletService, CreditWalletData } from '../wallet.service';

/**
 * Event handler that processes wallet credits when a subscription payment succeeds.
 *
 * This handler listens to PaymentSucceededEvent and credits the customer's wallet
 * with the subscription payment amount. It uses an idempotency key to prevent
 * duplicate credits in case of webhook retries.
 */
@EventsHandler(PaymentSucceededEvent)
@Injectable()
export class OnPaymentSucceededWalletHandler implements IEventHandler<PaymentSucceededEvent> {
  private readonly logger = new Logger(OnPaymentSucceededWalletHandler.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handles the PaymentSucceededEvent by crediting the customer's wallet.
   * Only processes events with a valid subscription ID.
   *
   * @param event - The payment succeeded event containing payment details
   */
  async handle(event: PaymentSucceededEvent): Promise<void> {
    // Only process subscription payments
    const subscriptionId = event.subscriptionId;
    if (!subscriptionId) {
      this.logger.debug('No subscription ID in event, skipping wallet credit');
      return;
    }

    const amount = event.amount;
    const payment = event.payment as { id?: string } | undefined;

    this.logger.log(
      `Processing wallet credit for subscription ${subscriptionId} with amount ${amount}`,
    );

    try {
      // Fetch subscription to get customer ID
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        select: { customerId: true },
      });

      if (!subscription?.customerId) {
        this.logger.warn(
          `Subscription ${subscriptionId} has no customer ID, skipping wallet credit`,
        );
        return;
      }

      // Build credit data with customer ID
      const creditData: CreditWalletData = {
        customerId: subscription.customerId,
        amount: Number(amount),
        referenceId: subscriptionId,
        referenceType: ReferenceType.SUBSCRIPTION,
        description: 'Wallet credit for subscription payment',
        idempotencyKey: `subscription_${subscriptionId}_payment_${payment?.id}`,
      };

      // Credit the wallet
      const result = await this.walletService.creditWallet(creditData);

      this.logger.log(
        `Wallet credited successfully for customer ${subscription.customerId}. New balance: ${result.balance}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process wallet credit for subscription ${subscriptionId}: ${errorMessage}`,
        errorStack,
      );
      // Don't throw - payment processing should not fail due to wallet issues
    }
  }
}
