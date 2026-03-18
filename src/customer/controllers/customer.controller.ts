import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomerService } from '../services/customer.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Customer Profile')
@ApiBearerAuth()
@Controller('customer/me')
@Roles('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Business logic rationale: Allow customers to view their profile information.
   * Security consideration: JWT authentication ensures only authenticated customers access their profile.
   * Design decision: Endpoint for retrieving customer profile with wallet data.
   */
  @ApiOperation({
    summary: 'Get Customer profile',
    description:
      'Allow customer to view their profile information including wallet balance and recent transactions.',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @Get('')
  async getProfile(@Req() req: any, @CurrentUser() vendor: any) {
    const { id } = vendor;
    return this.customerService.getProfile(id);
  }

  /**
   * Business logic rationale: Enable customers to update their profile details.
   * Security consideration: Ownership check via JWT, validation in service.
   * Design decision: Partial updates allowed, atomic operations.
   */
  @ApiOperation({
    summary: 'Update customer profile',
    description: 'Enable customers to update their profile details.',
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
    return this.customerService.updateProfile(id, dto);
  }

  /**
   * Business logic rationale: Soft delete customer profile by setting isActive flag to false.
   * Security consideration: JWT authentication ensures only the authenticated customer can delete their profile.
   * Design decision: Soft delete preserves data integrity while preventing login.
   */
  @ApiOperation({
    summary: 'Delete customer profile (soft delete)',
    description:
      'Soft delete customer profile by setting isActive flag to false.',
  })
  @ApiResponse({ status: 200, description: 'Profile deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @Delete('')
  @HttpCode(HttpStatus.OK)
  async deleteProfile(@CurrentUser() vendor: any) {
    const { id } = vendor;
    return this.customerService.deleteProfile(id);
  }
}
