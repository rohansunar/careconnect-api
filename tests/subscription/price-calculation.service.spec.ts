import {
  DayOfWeek,
  SubscriptionFrequency,
} from '../../src/subscription/interfaces/delivery-frequency.interface';
import { DeliveryFrequencyFactoryService } from '../../src/subscription/services/delivery-frequency/delivery-frequency.factory';
import { DeliveryFrequencyService } from '../../src/subscription/services/delivery-frequency.service';
import { PriceCalculationService } from '../../src/subscription/services/price-calculation.service';

describe('PriceCalculationService', () => {
  let deliveryFrequencyService: DeliveryFrequencyService;
  let priceCalculationService: PriceCalculationService;

  beforeEach(() => {
    deliveryFrequencyService = new DeliveryFrequencyService(
      new DeliveryFrequencyFactoryService(),
    );
    priceCalculationService = new PriceCalculationService(
      deliveryFrequencyService,
    );
  });

  it('includes the start date itself when it is a valid daily delivery date', () => {
    const startDate = new Date(2026, 2, 28);

    const breakdown = priceCalculationService.calculatePricingBreakdown(
      1,
      50,
      SubscriptionFrequency.DAILY,
      startDate,
    );

    expect(breakdown.nextDeliveryDate.getFullYear()).toBe(2026);
    expect(breakdown.nextDeliveryDate.getMonth()).toBe(2);
    expect(breakdown.nextDeliveryDate.getDate()).toBe(28);
    expect(breakdown.deliveryCount).toBe(4);
    expect(breakdown.totalPrice).toBe(200);
  });

  it('includes the start date itself for alternate-day schedules', () => {
    const startDate = new Date(2026, 2, 28);

    const breakdown = priceCalculationService.calculatePricingBreakdown(
      2,
      50,
      SubscriptionFrequency.ALTERNATIVE_DAYS,
      startDate,
    );

    expect(breakdown.nextDeliveryDate.getMonth()).toBe(2);
    expect(breakdown.nextDeliveryDate.getDate()).toBe(28);
    expect(breakdown.deliveryCount).toBe(2);
    expect(breakdown.totalPrice).toBe(200);
  });

  it('uses the start date itself for custom schedules when that weekday is selected', () => {
    const startDate = new Date(2026, 2, 27);
    expect(startDate.getDay()).toBe(DayOfWeek.FRIDAY);

    const firstDeliveryDate = deliveryFrequencyService.getFirstDeliveryDate(
      startDate,
      SubscriptionFrequency.CUSTOM_DAYS,
      [DayOfWeek.FRIDAY],
    );

    expect(firstDeliveryDate.getMonth()).toBe(2);
    expect(firstDeliveryDate.getDate()).toBe(27);
    expect(firstDeliveryDate.getDay()).toBe(DayOfWeek.FRIDAY);
  });

  it('finds the next valid custom delivery day after the start date', () => {
    const startDate = new Date(2026, 2, 27);
    expect(startDate.getDay()).toBe(DayOfWeek.FRIDAY);

    const nextDeliveryDate = deliveryFrequencyService.getNextDeliveryDate(
      startDate,
      SubscriptionFrequency.CUSTOM_DAYS,
      [DayOfWeek.FRIDAY],
    );

    expect(nextDeliveryDate.getMonth()).toBe(3);
    expect(nextDeliveryDate.getDate()).toBe(3);
    expect(nextDeliveryDate.getDay()).toBe(DayOfWeek.FRIDAY);
  });
});
