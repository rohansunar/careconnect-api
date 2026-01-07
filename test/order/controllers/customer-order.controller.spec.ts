import { Test, TestingModule } from '@nestjs/testing';
import { CustomerOrderController } from '../../../src/order/controllers/customer-order.controller';
import { CustomerOrderService } from '../../../src/order/services/customer-order.service';

describe('CustomerOrderController', () => {
  let controller: CustomerOrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerOrderController],
      providers: [
        {
          provide: CustomerOrderService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<CustomerOrderController>(CustomerOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
