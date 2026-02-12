import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RiderService } from '../services/rider.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { CreateRiderDto } from '../dto/create-rider.dto';

@ApiTags('Riders')
@Controller('riders')
@Roles('vendor')
export class RiderController {
  constructor(private readonly riderService: RiderService) {}
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
  @Post()
  @Roles('admin','vendor')
  async createRiderAdmin(
  @CurrentUser() user: User,
  @Body() dto: CreateRiderDto) {
    return this.riderService.createRider(dto, user);
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
  @Roles('admin','vendor')
  async getRiders(@CurrentUser() user: User) {
    return this.riderService.getRiders(user);
  }
}
