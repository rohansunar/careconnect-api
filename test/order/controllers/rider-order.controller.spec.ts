import { Test, TestingModule } from '@nestjs/testing';
import { RiderOrderController } from '../../../src/order/controllers/rider-order.controller';
import { RiderOrderService } from '../../../src/order/services/rider-order.service';

describe('RiderOrderController', () => {
  let controller: RiderOrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RiderOrderController],
      providers: [
        {
          provide: RiderOrderService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<RiderOrderController>(RiderOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
