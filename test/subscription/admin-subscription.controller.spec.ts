import { Test, TestingModule } from '@nestjs/testing';
import { AdminSubscriptionController } from '../controllers/admin-subscription.controller';
import { AdminSubscriptionService } from '../services/admin-subscription.service';
import { AdminVendorGuard } from '../../auth/guards/admin-vendor.guard';

describe('AdminSubscriptionController', () => {
  let controller: AdminSubscriptionController;
  let service: AdminSubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSubscriptionController],
      providers: [
        {
          provide: AdminSubscriptionService,
          useValue: {
            togglePaymentMode: jest.fn(),
            getPaymentMode: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminSubscriptionController>(
      AdminSubscriptionController,
    );
    service = module.get<AdminSubscriptionService>(AdminSubscriptionService);
  });

  describe('togglePaymentMode', () => {
    it('should toggle payment mode and return result', async () => {
      const mockResult = {
        message: 'Payment mode toggled successfully',
        payment_mode: 'POST_DELIVERY',
      };
      jest.spyOn(service, 'togglePaymentMode').mockResolvedValue(mockResult);

      const result = await controller.togglePaymentMode();

      expect(result).toEqual(mockResult);
      expect(service.togglePaymentMode).toHaveBeenCalled();
    });
  });

  describe('getPaymentMode', () => {
    it('should return the current payment mode', async () => {
      const mockResult = { payment_mode: 'UPFRONT' };
      jest.spyOn(service, 'getPaymentMode').mockResolvedValue(mockResult);

      const result = await controller.getPaymentMode();

      expect(result).toEqual(mockResult);
      expect(service.getPaymentMode).toHaveBeenCalled();
    });
  });
});
