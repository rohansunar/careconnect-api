import { DateTime } from 'luxon';
import { CustomerSubscriptionService } from '../../src/subscription/services/customer-subscription.service';
import {
  DayOfWeek,
  SubscriptionFrequency,
} from '../../src/subscription/interfaces/delivery-frequency.interface';
import { DeliveryFrequencyFactoryService } from '../../src/subscription/services/delivery-frequency/delivery-frequency.factory';
import { DeliveryFrequencyService } from '../../src/subscription/services/delivery-frequency.service';
import { PriceCalculationService } from '../../src/subscription/services/price-calculation.service';

describe('CustomerSubscriptionService', () => {
  let subscriptionRepository: {
    findByCustomerAndProduct: jest.Mock;
    create: jest.Mock;
  };
  let subscriptionValidationService: {
    validateDeliveryConfiguration: jest.Mock;
    getSchedulableProduct: jest.Mock;
    validateInputs: jest.Mock;
  };
  let paymentProvider: {
    initiatePayment: jest.Mock;
  };
  let prisma: {
    payment: { create: jest.Mock };
    subscription: { update: jest.Mock };
  };
  let service: CustomerSubscriptionService;

  beforeEach(() => {
    jest.useFakeTimers();

    subscriptionRepository = {
      findByCustomerAndProduct: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: 'sub_1',
        subscription_price: 400,
      }),
    };
    subscriptionValidationService = {
      validateDeliveryConfiguration: jest.fn(),
      getSchedulableProduct: jest.fn().mockResolvedValue({
        name: '20L Water Jar',
        images: ['jar.jpg'],
        subscription_price: 100,
      }),
      validateInputs: jest.fn(),
    };
    paymentProvider = {
      initiatePayment: jest.fn().mockResolvedValue({
        provider: 'mock-provider',
        providerPaymentId: 'provider_payment_1',
        payload: { orderId: 'sub_1' },
      }),
    };
    prisma = {
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'payment_1' }),
      },
      subscription: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const deliveryFrequencyService = new DeliveryFrequencyService(
      new DeliveryFrequencyFactoryService(),
    );
    const priceCalculationService = new PriceCalculationService(
      deliveryFrequencyService,
    );

    service = new CustomerSubscriptionService(
      subscriptionRepository as any,
      deliveryFrequencyService,
      priceCalculationService,
      subscriptionValidationService as any,
      paymentProvider as any,
      prisma as any,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('recalculateSubscriptionPreview', () => {
    it('defaults to tomorrow in IST and includes the start date as the first daily delivery', async () => {
      jest.setSystemTime(new Date('2026-03-27T04:00:00.000Z'));

      const preview = await service.recalculateSubscriptionPreview({
        productId: 'product_1',
      });

      expect(
        subscriptionValidationService.validateDeliveryConfiguration,
      ).toHaveBeenCalledWith(SubscriptionFrequency.DAILY, []);
      expect(preview).toEqual({
        productName: '20L Water Jar',
        productImage: 'jar.jpg',
        totalAmount: 400,
        totalUnits: 1,
        subscriptionPrice: 100,
        frequency: SubscriptionFrequency.DAILY,
        startDate: '2026-03-28',
        nextDeliveryDate: '2026-03-28',
        forMonth: 'March',
        totalDeliveries: 4,
      });
    });

    it('includes the explicit start date for custom schedules when that weekday is selected', async () => {
      jest.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));

      const preview = await service.recalculateSubscriptionPreview({
        productId: 'product_1',
        frequency: SubscriptionFrequency.CUSTOM_DAYS,
        start_date: '2026-03-27',
        custom_days: [DayOfWeek.FRIDAY, DayOfWeek.SUNDAY],
      });

      expect(
        subscriptionValidationService.validateDeliveryConfiguration,
      ).toHaveBeenCalledWith(SubscriptionFrequency.CUSTOM_DAYS, [
        DayOfWeek.FRIDAY,
        DayOfWeek.SUNDAY,
      ]);
      expect(preview).toEqual({
        productName: '20L Water Jar',
        productImage: 'jar.jpg',
        totalAmount: 200,
        totalUnits: 1,
        subscriptionPrice: 100,
        frequency: SubscriptionFrequency.CUSTOM_DAYS,
        startDate: '2026-03-27',
        nextDeliveryDate: '2026-03-27',
        forMonth: 'March',
        totalDeliveries: 2,
      });
    });
  });

  describe('createSubscription', () => {
    it('stores the start date itself as the first daily delivery date', async () => {
      subscriptionValidationService.validateInputs.mockResolvedValue({
        isValid: true,
        customerAddress: {
          id: 'address_1',
          customerId: 'customer_1',
          customer: {
            name: 'Test Customer',
            email: 'test@example.com',
            phone: '9999999999',
          },
        },
        product: {
          name: '20L Water Jar',
          images: ['jar.jpg'],
          subscription_price: 100,
        },
      });

      await service.createSubscription(
        { id: 'user_1' } as any,
        {
          productId: 'product_1',
          quantity: 1,
          frequency: SubscriptionFrequency.DAILY,
          start_date: '2099-03-28',
        } as any,
      );

      const createPayload = subscriptionRepository.create.mock.calls[0][0];

      expect(createPayload.total_price).toBe(400);
      expect(
        DateTime.fromJSDate(createPayload.nextDeliveryDate, {
          zone: 'Asia/Kolkata',
        }).toFormat('yyyy-MM-dd'),
      ).toBe('2099-03-28');
      expect(paymentProvider.initiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 400,
          orderId: 'sub_1',
        }),
      );
    });
  });
});
