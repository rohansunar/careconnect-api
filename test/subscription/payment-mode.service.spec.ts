import { Test, TestingModule } from '@nestjs/testing';
import { PaymentModeService } from '../services/payment-mode.service';
import { InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { JsonPaymentModeRepository } from '../services/payment-mode/payment-mode.repository';

jest.mock('fs');

describe('PaymentModeService', () => {
  let service: PaymentModeService;

  beforeEach(async () => {
    // Mock the filesystem operations before creating the module
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({ payment_mode: 'UPFRONT' }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentModeService, JsonPaymentModeRepository],
    }).compile();

    service = module.get<PaymentModeService>(PaymentModeService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentMode', () => {
    it('should return the current payment mode', () => {
      expect(service.getCurrentMode()).toBe('UPFRONT');
    });
  });

  describe('toggleMode', () => {
    it('should toggle the payment mode', () => {
      const newMode = service.toggleMode();
      expect(newMode).toBe('POST_DELIVERY');
    });
  });

  describe('validateMode', () => {
    it('should return true for valid payment modes', () => {
      expect(service.validateMode('UPFRONT')).toBe(true);
      expect(service.validateMode('POST_DELIVERY')).toBe(true);
    });

    it('should return false for invalid payment modes', () => {
      expect(service.validateMode('INVALID')).toBe(false);
    });
  });
});
