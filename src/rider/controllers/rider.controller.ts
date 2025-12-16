import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RiderService } from '../services/rider.service';
import { VendorAuthGuard } from '../../auth/guards/vendor-auth.guard';
import { AdminVendorGuard } from '../../auth/guards/admin-vendor.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/interfaces/user.interface';
import type { User } from '../../common/interfaces/user.interface';
import { CreateRiderDto } from '../dto/create-rider.dto';

@ApiTags('Riders')
@Controller('riders')
@UseGuards(VendorAuthGuard)
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  /**
   * Business logic rationale: Allow vendors to onboard new riders with a limit of 10 per vendor.
   * Security consideration: Vendor authentication ensures only authenticated vendors can create riders.
   * Design decision: Endpoint for creating a new rider linked to the vendor.
   */
  @ApiOperation({
    summary: 'Create a new rider',
    description: 'Allow vendors to onboard new riders, limited to 10 per vendor.',
  })
  @ApiResponse({ status: 201, description: 'Rider created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Post()
  async createRider(@Body() dto: CreateRiderDto, @CurrentUser() user: User) {
    const riderData = { ...dto, vendorId: user.id };
    return this.riderService.createRider(riderData, false);
  }

  /**
   * Business logic rationale: Allow admins to create riders for any vendor.
   * Security consideration: Admin authentication and role check.
   * Design decision: Separate endpoint for admin to create riders.
   */
  @ApiOperation({
    summary: 'Create a new rider (Admin only)',
    description: 'Allow admins to create riders for specified vendors.',
  })
  @ApiResponse({ status: 201, description: 'Rider created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async createRiderAdmin(@Body() dto: CreateRiderDto) {
    return this.riderService.createRider(dto, true);
  }

  /**
   * Business logic rationale: Retrieve riders based on user role.
   * Security consideration: Role-based access control.
   * Design decision: Vendors see their riders, admins see all.
   */
  @ApiOperation({
    summary: 'Get riders',
    description: 'Retrieve riders: vendors see their own, admins see all.',
  })
  @ApiResponse({ status: 200, description: 'Riders retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Get()
  @UseGuards(AdminVendorGuard)
  async getRiders(@CurrentUser() user: User) {
    return this.riderService.getRiders(user);
  }
}