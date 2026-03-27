import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { DeliveryFrequencyService } from './delivery-frequency.service';
import {
  SubscriptionFrequency,
  DayOfWeek,
} from '../interfaces/delivery-frequency.interface';
import { getAppTimezone } from '../../common/utils/timezone.utils';

export interface SubscriptionPricingBreakdown {
  deliveryCount: number;
  totalPrice: number;
  billingStartDate: Date;
  billingEndDate: Date;
  nextDeliveryDate: Date;
}

/**
 * Service responsible for calculating the total price of a subscription.
 * This service uses the strategy pattern to delegate price calculations to
 * appropriate calculator implementations based on frequency type.
 */
@Injectable()
export class PriceCalculationService {
  private readonly logger = new Logger(PriceCalculationService.name);
  private readonly appTimezone = getAppTimezone();

  constructor(
    private readonly deliveryFrequencyService: DeliveryFrequencyService,
  ) {}

  calculatePricingBreakdown(
    quantity: number,
    price: number,
    frequency: SubscriptionFrequency,
    startDate: Date,
    customDays?: DayOfWeek[],
  ): SubscriptionPricingBreakdown {
    this.logger.log(
      `Starting subscription pricing breakdown. Quantity: ${quantity}, Price: ${price}, Frequency: ${frequency}, Start Date: ${startDate.toISOString()}`,
    );

    const nextDeliveryDate = this.deliveryFrequencyService.getFirstDeliveryDate(
      startDate,
      frequency,
      customDays,
    );
    const nextDeliveryDateTime = DateTime.fromJSDate(nextDeliveryDate, {
      zone: this.appTimezone,
    });
    const billingStartDateTime = nextDeliveryDateTime.startOf('month');
    const billingEndDateTime = nextDeliveryDateTime.endOf('month');

    let deliveryCount = 0;
    let deliveryCursor = nextDeliveryDateTime;

    while (deliveryCursor.toMillis() <= billingEndDateTime.toMillis()) {
      deliveryCount++;

      const followingDelivery =
        this.deliveryFrequencyService.getNextDeliveryDate(
          deliveryCursor.toJSDate(),
          frequency,
          customDays,
        );
      const followingDeliveryTime = DateTime.fromJSDate(followingDelivery, {
        zone: this.appTimezone,
      });

      if (followingDeliveryTime.toMillis() <= deliveryCursor.toMillis()) {
        throw new Error('Delivery schedule did not advance');
      }

      deliveryCursor = followingDeliveryTime;
    }

    const totalPrice = deliveryCount * price * quantity;

    this.logger.log(
      `Subscription pricing breakdown complete. Deliveries: ${deliveryCount}, Total price: ${totalPrice}, Next delivery: ${nextDeliveryDate.toISOString()}`,
    );

    return {
      deliveryCount,
      totalPrice,
      billingStartDate: billingStartDateTime.toJSDate(),
      billingEndDate: billingEndDateTime.toJSDate(),
      nextDeliveryDate,
    };
  }
}
