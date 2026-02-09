import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import type { VendorDashboardResponse } from '../dashboard/dashboard.types';

/**
 * Controller for vendor dashboard endpoints.
 *
 * Provides API endpoints for vendors to retrieve
 * their dashboard statistics including orders, earnings, and payouts.
 */
@ApiTags('Vendor Dashboard')
@Controller('vendors/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Retrieves the complete dashboard data for the authenticated vendor.
   *
   * @param user - The authenticated vendor user from JWT token
   * @returns Promise containing the dashboard response
   */
  @ApiOperation({
    summary: 'Get vendor dashboard',
    description:
      'Retrieves the complete dashboard data including today stats, earnings, and payouts for the authenticated vendor.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing authentication token.',
  })
  @Get()
  async getDashboard(
    @CurrentUser() user: User,
  ): Promise<VendorDashboardResponse> {
    return this.dashboardService.getDashboardData(user.id);
  }
}
