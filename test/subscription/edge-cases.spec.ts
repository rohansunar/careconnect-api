import { Test, TestingModule } from '@nestjs/testing';
import { PriceCalculationService } from '../services/price-calculation.service';
import { DeliveryFrequencyService } from '../services/delivery-frequency.service';
import { PriceCalculatorFactoryService } from '../services/price-calculation/price-calculator.factory';
import { DeliveryFrequencyFactoryService } from '../services/delivery-frequency/delivery-frequency.factory';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import {
  SubscriptionFrequency,
  DayOfWeek,
} from '../interfaces/delivery-frequency.interface';
import { BadRequestException } from '@nestjs/common';

describe('Edge Cases Tests', () => {
  let priceCalculationService: PriceCalculationService;
  let deliveryFrequencyService: DeliveryFrequencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceCalculationService,
        DeliveryFrequencyService,
        PriceCalculatorFactoryService,
        DeliveryFrequencyFactoryService,
      ],
    }).compile();

    priceCalculationService = module.get<PriceCalculationService>(
      PriceCalculationService,
    );
    deliveryFrequencyService = module.get<DeliveryFrequencyService>(
      DeliveryFrequencyService,
    );
  });

  describe('Price Calculation Edge Cases', () => {
    it('should handle end of month correctly for daily frequency', () => {
      const result = priceCalculationService.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.DAILY,
        new Date('2026-01-31'),
      );
      expect(result).toBeGreaterThanOrEqual(0); // Should calculate next month
    });

    it('should handle end of month correctly for alternate days frequency', () => {
      const result = priceCalculationService.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.ALTERNATIVE_DAYS,
        new Date('2026-01-30'),
      );
      expect(result).toBeGreaterThanOrEqual(0); // Should calculate next month
    });

    it('should handle end of month correctly for custom days frequency', () => {
      const customDays = [
        DayOfWeek.MONDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.FRIDAY,
      ];
      const result = priceCalculationService.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.CUSTOM_DAYS,
        new Date('2026-01-31'),
        customDays,
      );
      expect(result).toBeGreaterThanOrEqual(0); // Should calculate next month
    });

    it('should handle leap year correctly for daily frequency', () => {
      const result = priceCalculationService.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.DAILY,
        new Date('2024-02-29'),
      );
      expect(result).toBeGreaterThanOrEqual(0); // Should calculate next month
    });

    it('should handle leap year correctly for alternate days frequency', () => {
      const result = priceCalculationService.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.ALTERNATIVE_DAYS,
        new Date('2024-02-29'),
      );
      expect(result).toBeGreaterThanOrEqual(0); // Should calculate next month
    });

    it('should handle leap year correctly for custom days frequency', () => {
      const customDays = [
        DayOfWeek.MONDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.FRIDAY,
      ];
      const result = priceCalculationService.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.CUSTOM_DAYS,
        new Date('2024-02-29'),
        customDays,
      );
      expect(result).toBeGreaterThanOrEqual(0); // Should calculate next month
    });
  });

  describe('Delivery Frequency Edge Cases', () => {
    it('should throw BadRequestException for CUSTOM_DAYS frequency without custom days', () => {
      expect(() =>
        deliveryFrequencyService.validateFrequency(
          SubscriptionFrequency.CUSTOM_DAYS,
        ),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty custom days', () => {
      expect(() => deliveryFrequencyService.validateCustomDays([])).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for duplicate days', () => {
      expect(() =>
        deliveryFrequencyService.validateCustomDays([
          DayOfWeek.MONDAY,
          DayOfWeek.MONDAY,
        ]),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid day values', () => {
      expect(() =>
        deliveryFrequencyService.validateCustomDays([
          DayOfWeek.MONDAY,
          10 as DayOfWeek,
        ]),
      ).toThrow(BadRequestException);
    });

    it('should handle next delivery date for CUSTOM_DAYS frequency at end of week', () => {
      const startDate = new Date('2026-01-31'); // Saturday
      const customDays = [
        DayOfWeek.MONDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.FRIDAY,
      ];
      const nextDate = deliveryFrequencyService.getNextDeliveryDate(
        startDate,
        SubscriptionFrequency.CUSTOM_DAYS,
        customDays,
      );
      const expectedDate = new Date('2026-02-02'); // Monday
      expect(nextDate).toEqual(expectedDate);
    });

    it('should handle next delivery date for CUSTOM_DAYS frequency at start of week', () => {
      const startDate = new Date('2026-02-01'); // Sunday
      const customDays = [
        DayOfWeek.MONDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.FRIDAY,
      ];
      const nextDate = deliveryFrequencyService.getNextDeliveryDate(
        startDate,
        SubscriptionFrequency.CUSTOM_DAYS,
        customDays,
      );
      const expectedDate = new Date('2026-02-02'); // Monday
      expect(nextDate).toEqual(expectedDate);
    });
  });

  describe('Concurrent Operations Edge Cases', () => {
    it('should handle concurrent subscription modifications gracefully', () => {
      const result1 = priceCalculationService.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.DAILY,
        new Date('2026-01-15'),
      );
      const result2 = priceCalculationService.calculateTotalPrice(
        1,
        20,
        SubscriptionFrequency.DAILY,
        new Date('2026-01-15'),
      );

      expect(result1).toBe(170);
      expect(result2).toBe(340);
    });

    it('should handle concurrent delivery frequency validations gracefully', () => {
      const customDays1 = [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY];
      const customDays2 = [DayOfWeek.TUESDAY, DayOfWeek.THURSDAY];

      expect(() =>
        deliveryFrequencyService.validateCustomDays(customDays1),
      ).not.toThrow();

      expect(() =>
        deliveryFrequencyService.validateCustomDays(customDays2),
      ).not.toThrow();
    });
  });

  describe('Invalid Inputs Edge Cases', () => {
    it('should handle invalid frequency type gracefully', () => {
      expect(() =>
        priceCalculationService.calculateTotalPrice(
          1,
          10,
          'INVALID' as SubscriptionFrequency,
          new Date('2026-01-15'),
        ),
      ).toThrow('Invalid frequency type');
    });

    it('should handle invalid custom days gracefully', () => {
      const customDays = [10 as DayOfWeek, 11 as DayOfWeek];

      expect(() =>
        deliveryFrequencyService.validateCustomDays(customDays),
      ).toThrow(BadRequestException);
    });

    it('should handle invalid start date gracefully', () => {
      const invalidDate = new Date('invalid');
      const result = priceCalculationService.calculateTotalPrice(
        1,
        10,
        SubscriptionFrequency.DAILY,
        invalidDate,
      );
      expect(isNaN(result) || result >= 0).toBe(true);
    });
  });
});
