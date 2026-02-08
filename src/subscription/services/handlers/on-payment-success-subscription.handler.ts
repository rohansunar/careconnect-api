import { Injectable } from '@nestjs/common';
import { EventsHandler } from '@nestjs/cqrs';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { PaymentSucceededEvent } from 'src/payment/services/payment-succeeded.event';

@EventsHandler(PaymentSucceededEvent)
@Injectable()
export class OnPaymentSucceededSubscriptionHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: PaymentSucceededEvent): Promise<void> {
    if (!event.subscriptionId) return;

    await this.prisma.subscription.update({
      where: { id: event.subscriptionId },
      data: { status: SubscriptionStatus.ACTIVE },
    });
  }
}
