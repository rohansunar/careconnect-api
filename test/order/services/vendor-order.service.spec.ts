import { Test, TestingModule } from '@nestjs/testing';
import { VendorOrderService } from '../../../src/order/services/vendor-order.service';
import { OrderService } from '../../../src/order/services/order.service';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { CartService } from '../../../src/cart/services/cart.service';
import { PaymentService } from '../../../src/payment/services/payment.service';
import { NotificationService } from '../../../src/notification/services/notification.service';

describe('VendorOrderService', () => {
  let service: VendorOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorOrderService,
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

    service = module.get<VendorOrderService>(VendorOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
