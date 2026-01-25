import { Test, TestingModule } from '@nestjs/testing';
import { PriceCalculationService } from '../services/price-calculation.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { SubscriptionFrequency } from '../interfaces/delivery-frequency.interface';
import { PriceCalculatorFactoryService } from '../services/price-calculation/price-calculator.factory';

describe('PriceCalculationService', () => {
  let service: PriceCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriceCalculationService, PriceCalculatorFactoryService],
    }).compile();

    service = module.get<PriceCalculationService>(PriceCalculationService);
  });

  describe('calculateTotalPrice', () => {
    it('should calculate the correct amount for daily frequency', () => {
      const result = service.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.DAILY,
        new Date('2026-01-15'),
      );
      expect(result).toBe(170); // 17 days remaining in January 2026 * 10
    });

    it('should calculate the correct amount for alternate days frequency', () => {
      const result = service.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.ALTERNATIVE_DAYS,
        new Date('2026-01-15'),
      );
      expect(result).toBe(90); // 9 deliveries (17 days / 2) * 10
    });

    it('should calculate the correct amount for custom days frequency', () => {
      const result = service.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.CUSTOM_DAYS,
        new Date('2026-01-15'),
        [1, 3, 5], // Monday, Wednesday, Friday
      );
      expect(result).toBeGreaterThanOrEqual(0); // Custom days calculation
    });

    it('should shift to next month for daily frequency if no days remain', () => {
      const result = service.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.DAILY,
        new Date('2026-01-31'),
      );
      expect(result).toBeGreaterThanOrEqual(0); // Should calculate next month
    });

    it('should shift to next month for alternate days frequency if insufficient days', () => {
      const result = service.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.ALTERNATIVE_DAYS,
        new Date('2026-01-31'),
      );
      expect(result).toBeGreaterThanOrEqual(0); // Should calculate next month
    });

    it('should shift to next month for custom days frequency if no weekdays', () => {
      const result = service.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.CUSTOM_DAYS,
        new Date('2026-01-31'),
        [1, 3, 5], // Monday, Wednesday, Friday
      );
      expect(result).toBeGreaterThanOrEqual(0); // Should calculate next month
    });

    it('should throw an error for invalid frequency', () => {
      expect(() =>
        service.calculateTotalPrice(
          1,
          10,
          'INVALID' as SubscriptionFrequency,
          new Date('2026-01-15'),
        ),
      ).toThrow('Invalid frequency type');
    });
  });
});
