import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  ValidationPipe,
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
import {
  RecalculateSubscriptionPreviewDto,
  RecalculateSubscriptionPreviewResponseDto,
} from '../dto/subscription-preview.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Customer Subscriptions')
@Controller('customer/subscriptions')
@Roles('customer')
export class CustomerSubscriptionController {
  constructor(
    private readonly customerSubscriptionService: CustomerSubscriptionService,
  ) {}

  @ApiOperation({
    summary: 'Preview subscription before creation',
    description:
      'Recalculates subscription preview details using the requested product, units, frequency, start date, and custom weekday schedule.',
  })
  @ApiBody({
    type: RecalculateSubscriptionPreviewDto,
    description:
      'Recalculation data including productId and optional frequency, start_date, and custom_days.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription preview recalculated successfully.',
    type: RecalculateSubscriptionPreviewResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid recalculation input.',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found.',
  })
  @Post('preview')
  async calculateSubscriptionPreview(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: RecalculateSubscriptionPreviewDto,
  ) {
    return this.customerSubscriptionService.calculateSubscriptionPreview(dto);
  }

  /**
   * Creates a new subscription for the authenticated customer.
   * @param user - The authenticated customer user
   * @param dto - The subscription data
   * @returns The created subscription with calculated total price and payment mode
   */
  @ApiOperation({
    summary: 'Create a new subscription',
    description:
      'Creates a new subscription for the authenticated customer with calculated total price and payment mode.',
  })
  @ApiBody({
    type: CreateSubscriptionDto,
    description:
      'Subscription data including product ID, quantity, frequency, start date, and optional custom days',
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully.',
    schema: {
      example: {
        id: 'string',
        total_price: 0,
        payment_mode: 'UPFRONT',
        customer: {
          name: 'string',
          email: 'string',
          phone: 'string',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer address or product not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate subscription for the same product and address.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.customerSubscriptionService.getMySubscriptions(
      user,
      pageNum,
      limitNum,
    );
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
    description:
      'Toggles the status of a subscription between ACTIVE and INACTIVE.',
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
    description:
      'Deletes a subscription that belongs to the authenticated customer.',
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
  async deleteMySubscription(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.customerSubscriptionService.deleteMySubscription(id, user);
  }
}
