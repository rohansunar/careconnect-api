import { Test, TestingModule } from '@nestjs/testing';
import { CustomerOrderService } from '../../../src/order/services/customer-order.service';
import { OrderService } from '../../../src/order/services/order.service';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { CartService } from '../../../src/cart/services/cart.service';
import { PaymentService } from '../../../src/payment/services/payment.service';
import { NotificationService } from '../../../src/notification/services/notification.service';

describe('CustomerOrderService', () => {
  let service: CustomerOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerOrderService,
        OrderService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: CartService,
          useValue: {},
        },
        {
          provide: PaymentService,
          useValue: {},
        },
        {
          provide: NotificationService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CustomerOrderService>(CustomerOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests as needed
});
