import { Controller, Get, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminSubscriptionService } from '../services/admin-subscription.service';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Admin Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@Roles('admin')
export class AdminSubscriptionController {
  constructor(
    private readonly adminSubscriptionService: AdminSubscriptionService,
  ) {}

  /**
   * Toggles the default payment mode for all subscription creations.
   * @returns An object with a success message and the updated payment mode
   */
  @ApiOperation({
    summary: 'Toggle default payment mode',
    description:
      'Toggles the default payment mode between (UPFRONT|POST_DELIVERY).',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment mode toggled successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid/missing token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions.',
  })
  @Patch('payment-mode')
  async togglePaymentMode() {
    return this.adminSubscriptionService.togglePaymentMode();
  }

  /**
   * Retrieves the current default payment mode.
   * @returns An object with the current payment mode
   */
  @ApiOperation({
    summary: 'Get default payment mode',
    description: 'Retrieves the current default payment mode.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment mode retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid/missing token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions.',
  })
  @Get('payment-mode')
  async getPaymentMode() {
    return this.adminSubscriptionService.getPaymentMode();
  }
}
