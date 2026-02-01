import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VendorService } from '../services/vendor.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Vendor Profile')
@Controller('vendor/me')
@Roles('vendor')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  /**
   * Business logic rationale: Allow vendors to view their profile information.
   * Security consideration: JWT authentication ensures only authenticated vendors access their profile.
   * Design decision: Cached endpoint for performance.
   */
  @ApiOperation({
    summary: 'Get vendor profile',
    description: 'Allow vendors to view their profile information.',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Get('')
  async getProfile(@Req() req: any, @CurrentUser() vendor: any) {
    const { id } = vendor;
    return this.vendorService.getProfile(id);
  }

  /**
   * Business logic rationale: Enable vendors to update their profile details.
   * Security consideration: Ownership check via JWT, validation in service.
   * Design decision: Partial updates allowed, atomic operations.
   */
  @ApiOperation({
    summary: 'Update vendor profile',
    description: 'Enable vendors to update their profile details.',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Put('')
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    return this.vendorService.updateProfile(id, dto);
  }

  /**
   * Business logic rationale: Allow vendors to update their availability status.
   * Security consideration: Ownership check via JWT.
   * Design decision: Separate endpoint for availability to allow fine-grained control.
   */
  @ApiOperation({
    summary: 'Update vendor availability',
    description: 'Allow vendors to update their availability status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Availability updated successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Put('availability')
  async updateAvailability(
    @Req() req: any,
    @Body() dto: UpdateAvailabilityDto,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    return this.vendorService.updateAvailability(id, dto);
  }
}
