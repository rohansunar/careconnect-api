import { Test, TestingModule } from '@nestjs/testing';
import { AdminOrderController } from '../../../src/order/controllers/admin-order.controller';
import { AdminOrderService } from '../../../src/order/services/admin-order.service';

describe('AdminOrderController', () => {
  let controller: AdminOrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrderController],
      providers: [
        {
          provide: AdminOrderService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AdminOrderController>(AdminOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
