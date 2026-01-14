import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryFrequencyService } from '../services/delivery-frequency.service';
import { DayOfWeek, SubscriptionFrequency } from '../interfaces/delivery-frequency.interface';
import { BadRequestException } from '@nestjs/common';

describe('DeliveryFrequencyService', () => {
  let service: DeliveryFrequencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryFrequencyService],
    }).compile();

    service = module.get<DeliveryFrequencyService>(DeliveryFrequencyService);
  });

  describe('validateFrequency', () => {
    it('should not throw for DAILY frequency without custom days', () => {
      expect(() => {
        service.validateFrequency(SubscriptionFrequency.DAILY);
      }).not.toThrow();
    });

    it('should not throw for ALTERNATIVE_DAYS frequency without custom days', () => {
      expect(() => {
        service.validateFrequency(SubscriptionFrequency.ALTERNATIVE_DAYS);
      }).not.toThrow();
    });

    it('should throw for CUSTOM_DAYS frequency without custom days', () => {
      expect(() => {
        service.validateFrequency(SubscriptionFrequency.CUSTOM_DAYS);
      }).toThrow(BadRequestException);
    });

    it('should not throw for CUSTOM_DAYS frequency with valid custom days', () => {
      expect(() => {
        service.validateFrequency(SubscriptionFrequency.CUSTOM_DAYS, [
          DayOfWeek.MONDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.FRIDAY,
        ]);
      }).not.toThrow();
    });
  });

  describe('validateCustomDays', () => {
    it('should throw for empty custom days', () => {
      expect(() => {
        service.validateCustomDays([]);
      }).toThrow(BadRequestException);
    });

    it('should throw for duplicate days', () => {
      expect(() => {
        service.validateCustomDays([DayOfWeek.MONDAY, DayOfWeek.MONDAY]);
      }).toThrow(BadRequestException);
    });

    it('should throw for invalid day', () => {
      expect(() => {
        service.validateCustomDays(['INVALID_DAY' as DayOfWeek]);
      }).toThrow(BadRequestException);
    });

    it('should not throw for valid unique days', () => {
      expect(() => {
        service.validateCustomDays([DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY]);
      }).not.toThrow();
    });
  });

  describe('getNextDeliveryDate', () => {
    const baseDate = new Date('2023-01-01T00:00:00Z'); // Sunday

    it('should return next day for DAILY frequency', () => {
      const nextDate = service.getNextDeliveryDate(baseDate, SubscriptionFrequency.DAILY);
      expect(nextDate).toEqual(new Date('2023-01-02T00:00:00Z'));
    });

    it('should return day after next for ALTERNATIVE_DAYS frequency', () => {
      const nextDate = service.getNextDeliveryDate(baseDate, SubscriptionFrequency.ALTERNATIVE_DAYS);
      expect(nextDate).toEqual(new Date('2023-01-03T00:00:00Z'));
    });

    it('should return next custom day for CUSTOM_DAYS frequency', () => {
      const customDays = [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY];
      const nextDate = service.getNextDeliveryDate(baseDate, SubscriptionFrequency.CUSTOM_DAYS, customDays);
      expect(nextDate).toEqual(new Date('2023-01-02T00:00:00Z')); // Monday
    });

    it('should throw for CUSTOM_DAYS without custom days', () => {
      expect(() => {
        service.getNextDeliveryDate(baseDate, SubscriptionFrequency.CUSTOM_DAYS);
      }).toThrow(BadRequestException);
    });
  });

  describe('getDeliveryDays', () => {
    it('should return all days for DAILY frequency', () => {
      const days = service.getDeliveryDays(SubscriptionFrequency.DAILY);
      expect(days).toEqual(Object.values(DayOfWeek));
    });

    it('should return alternative days for ALTERNATIVE_DAYS frequency', () => {
      const days = service.getDeliveryDays(SubscriptionFrequency.ALTERNATIVE_DAYS);
      expect(days).toEqual([
        DayOfWeek.MONDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SUNDAY,
      ]);
    });

    it('should return custom days for CUSTOM_DAYS frequency', () => {
      const customDays = [DayOfWeek.TUESDAY, DayOfWeek.THURSDAY];
      const days = service.getDeliveryDays(SubscriptionFrequency.CUSTOM_DAYS, customDays);
      expect(days).toEqual(customDays);
    });

    it('should throw for CUSTOM_DAYS without custom days', () => {
      expect(() => {
        service.getDeliveryDays(SubscriptionFrequency.CUSTOM_DAYS);
      }).toThrow(BadRequestException);
    });
  });
});