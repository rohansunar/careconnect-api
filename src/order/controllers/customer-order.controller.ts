import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomerOrderService } from '../services/customer-order.service';
import { CancelOrderDto } from '../dto/cancel-order.dto';
import { CreateOrderFromCartDto } from '../dto/create-order-from-cart.dto';
import { GetMyOrdersQueryDto } from '../dto/get-my-orders-query.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  CreateOrderFromCartDocs,
  GetMyOrdersDocs,
  GetMyOrderDocs,
} from '../docs/order.docs';
import { ConfirmOrderDocs } from '../docs/confirm-order.docs';
import { CancelOrderDocs } from '../docs/cancel-order.docs';

@ApiTags('Customer Orders')
@Controller('customer/orders')
@Roles('customer')
export class CustomerOrderController {
  constructor(private readonly customerOrderService: CustomerOrderService) {}

  @Post()
  @CreateOrderFromCartDocs()
  async createOrder(
    @Body() dto: CreateOrderFromCartDto,
    @CurrentUser() user: User,
  ) {
    return this.customerOrderService.createOrderFromCart(dto, user);
  }

  @Get()
  @GetMyOrdersDocs()
  async getMyOrders(
    @CurrentUser() user: User,
    @Query() query: GetMyOrdersQueryDto,
  ) {
    const pageNum = query.page ? parseInt(query.page, 10) : 1;
    const limitNum = query.limit ? parseInt(query.limit, 10) : 10;
    return this.customerOrderService.getMyOrders(
      user,
      query.delivery_status,
      pageNum,
      limitNum,
    );
  }

  @Get(':id')
  @GetMyOrderDocs()
  async getMyOrder(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customerOrderService.getMyOrder(id, user);
  }

  @Post(':orderId/confirm')
  @ConfirmOrderDocs()
  async confirmMyOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
  ) {
    return this.customerOrderService.confirmOrder(orderId, user);
  }

  @Post(':orderId/cancel')
  @CancelOrderDocs()
  async cancelMyOrder(
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.customerOrderService.cancelMyOrder(orderId, dto, user);
  }
}
