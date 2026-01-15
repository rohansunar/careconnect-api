import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Put,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomerSubscriptionService } from '../services/customer-subscription.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { CustomerAuthGuard } from '../../auth/guards/customer-auth.guard';

@ApiTags('Customer Subscriptions')
@Controller('customer/subscriptions')
@UseGuards(CustomerAuthGuard)
export class CustomerSubscriptionController {
  constructor(
    private readonly customerSubscriptionService: CustomerSubscriptionService,
  ) {}

  /**
   * Creates a new subscription for the authenticated customer.
   * @param user - The authenticated customer user
   * @param dto - The subscription data
   * @returns The created subscription
   */
  @ApiOperation({
    summary: 'Create a new subscription',
    description:
      'Creates a new subscription for the authenticated customer.',
  })
  @ApiBody({
    type: CreateSubscriptionDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully.',
  })
  @Post()
  async createSubscription(
    @CurrentUser() user: User,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.customerSubscriptionService.createSubscription(user, dto);
  }

  /**
   * Retrieves all subscriptions for the authenticated customer with optional filtering.
   * @param user - The authenticated customer user
   * @param status - Optional status filter (string or array)
   * @param page - Page number for pagination (default 1)
   * @param limit - Number of items per page (default 10)
   * @returns Array of customer's subscriptions
   */
  @ApiOperation({
    summary: 'Get my subscriptions',
    description:
      'Retrieves a list of subscriptions for the authenticated customer, with optional status filtering and pagination.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    schema: {
      type: 'array',
      items: { type: 'string' },
      default: ['ACTIVE', 'INACTIVE'],
    },
    description:
      'Filter by subscription status(es). Can be a single status or comma-separated string.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    schema: { type: 'integer', default: 1 },
    description: 'Page number for pagination.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: { type: 'integer', default: 10 },
    description: 'Number of items per page.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions retrieved successfully.',
  })
  @Get()
  async getMySubscriptions(
    @CurrentUser() user: User,
    @Query('status') status?: string | string[],
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const statuses = status
      ? Array.isArray(status)
        ? status
        : status.split(',').map((s) => s.trim())
      : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.customerSubscriptionService.getMySubscriptions(
      user,
      statuses,
      pageNum,
      limitNum,
    );
  }

  /**
   * Retrieves a single subscription by ID for the authenticated customer.
   * @param id - The unique identifier of the subscription
   * @param user - The authenticated customer user
   * @returns The subscription
   */
  @ApiOperation({
    summary: 'Get my subscription by ID',
    description:
      'Retrieves a single subscription by its ID, ensuring it belongs to the authenticated customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the subscription (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription retrieved successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - subscription does not belong to customer.',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription not found.',
  })
  @Get(':id')
  async getMySubscription(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customerSubscriptionService.getMySubscription(id, user);
  }

  /**
   * Updates a subscription for the authenticated customer.
   * @param id - The unique identifier of the subscription
   * @param dto - The subscription data
   * @param user - The authenticated customer user
   * @returns The updated subscription
   */
  @ApiOperation({
    summary: 'Update my subscription',
    description: 'Updates a subscription that belongs to the authenticated customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the subscription (UUID)',
  })
  @ApiBody({
    type: UpdateSubscriptionDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - subscription does not belong to customer.',
  })
  @Put(':id')
  async updateMySubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() user: User,
  ) {
    return this.customerSubscriptionService.updateMySubscription(id, dto, user);
  }

  /**
   * Toggles the status of a subscription for the authenticated customer.
   * @param id - The unique identifier of the subscription
   * @param user - The authenticated customer user
   * @param action - The action to perform (pause or resume)
   * @returns The updated subscription
   */
   @ApiOperation({
     summary: 'Toggle subscription status',
     description: 'Toggles the status of a subscription between ACTIVE and INACTIVE.',
   })
   @ApiParam({
     name: 'id',
     description: 'Unique identifier of the subscription (UUID)',
   })
   @ApiResponse({
     status: 200,
     description: 'Subscription status toggled successfully.',
   })
   @ApiResponse({
     status: 403,
     description: 'Forbidden - subscription does not belong to customer.',
   })
   @Post(':id/toggle')
   async toggleSubscriptionStatus(
     @Param('id') id: string,
     @CurrentUser() user: User,
   ) {
     return this.customerSubscriptionService.toggleSubscriptionStatus(id, user);
   }

  /**
   * Deletes a subscription for the authenticated customer.
   * @param id - The unique identifier of the subscription
   * @param user - The authenticated customer user
   * @returns The deleted subscription
   */
  @ApiOperation({
    summary: 'Delete my subscription',
    description: 'Deletes a subscription that belongs to the authenticated customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the subscription (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription deleted successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - subscription does not belong to customer.',
  })
  @Delete(':id')
  async deleteMySubscription(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customerSubscriptionService.deleteMySubscription(id, user);
  }
}