import { Test, TestingModule } from '@nestjs/testing';
import { AdminSubscriptionService } from '../services/admin-subscription.service';
import { PaymentModeService } from '../services/payment-mode.service';
import { NotFoundException } from '@nestjs/common';

describe('AdminSubscriptionService', () => {
  let service: AdminSubscriptionService;
  let paymentModeService: PaymentModeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSubscriptionService,
        {
          provide: PaymentModeService,
          useValue: {
            toggleMode: jest.fn(),
            getCurrentMode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminSubscriptionService>(AdminSubscriptionService);
    paymentModeService = module.get<PaymentModeService>(PaymentModeService);
  });

  describe('togglePaymentMode', () => {
    it('should toggle payment mode successfully', async () => {
      const mockMode = 'POST_DELIVERY';
      jest.spyOn(paymentModeService, 'toggleMode').mockReturnValue(mockMode);

      const result = await service.togglePaymentMode();

      expect(result).toEqual({
        message: 'Payment mode toggled successfully',
        payment_mode: mockMode,
      });
    });

    it('should throw NotFoundException if payment mode toggle fails', async () => {
      jest
        .spyOn(paymentModeService, 'toggleMode')
        .mockImplementation(() => {
          throw new Error('Failed to toggle');
        });

      await expect(service.togglePaymentMode()).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPaymentMode', () => {
    it('should return the current payment mode', async () => {
      const mockMode = 'UPFRONT';
      jest.spyOn(paymentModeService, 'getCurrentMode').mockReturnValue(mockMode);

      const result = await service.getPaymentMode();

      expect(result).toEqual({ payment_mode: mockMode });
    });

    it('should throw NotFoundException if payment mode retrieval fails', async () => {
      jest
        .spyOn(paymentModeService, 'getCurrentMode')
        .mockImplementation(() => {
          throw new Error('Failed to retrieve');
        });

      await expect(service.getPaymentMode()).rejects.toThrow(NotFoundException);
    });
  });
});