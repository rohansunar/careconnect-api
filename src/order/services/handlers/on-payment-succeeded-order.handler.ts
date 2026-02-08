import { Injectable } from '@nestjs/common';
import { EventsHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/common/database/prisma.service';
import { PaymentSucceededEvent } from 'src/payment/services/payment-succeeded.event';

@EventsHandler(PaymentSucceededEvent)
@Injectable()
export class OnPaymentSucceededOrderHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: PaymentSucceededEvent): Promise<void> {
    if (!event.orderId) return;

    await this.prisma.order.update({
      where: { id: event.orderId },
      data: {
        payment_status: 'PAID',
      },
    });
  }
}
