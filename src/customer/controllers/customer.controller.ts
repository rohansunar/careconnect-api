import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CustomerService } from '../services/customer.service';
import { VendorAuthGuard } from '../../auth/guards/vendor-auth.guard';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { CurrentVendor } from '../../auth/decorators/current-vendor.decorator';

@ApiTags('Customer Profile')
@Controller('customer/me')
@UseGuards(VendorAuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Business logic rationale: Allow vendors to view their profile information.
   * Security consideration: JWT authentication ensures only authenticated vendors access their profile.
   * Design decision: Cached endpoint for performance.
   */
  @ApiOperation({
    summary: 'Get Customer profile',
    description: 'Allow  ustomer to view their profile information.',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Get('')
  async getProfile(@Req() req: any, @CurrentVendor() vendor: any) {
    const { id } = vendor;
    return this.customerService.getProfile(id);
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
    @CurrentVendor() vendor: any,
  ) {
    const { id } = vendor;
    return this.customerService.updateProfile(id, dto);
  }
}
