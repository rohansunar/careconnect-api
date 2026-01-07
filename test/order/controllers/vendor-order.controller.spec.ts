import { Test, TestingModule } from '@nestjs/testing';
import { VendorOrderController } from '../../../src/order/controllers/vendor-order.controller';
import { VendorOrderService } from '../../../src/order/services/vendor-order.service';

describe('VendorOrderController', () => {
  let controller: VendorOrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorOrderController],
      providers: [
        {
          provide: VendorOrderService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<VendorOrderController>(VendorOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
