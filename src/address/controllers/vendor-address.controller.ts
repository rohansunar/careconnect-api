import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VendorAddressService } from '../services/vendor-address.service';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Vendor Addresses')
@Controller('vendor')
@Roles('vendor')
export class VendorAddressController {
  constructor(private readonly vendorAddressService: VendorAddressService) {}

  /**
   * Creates a new vendor address, validating the vendor and managing location creation or reuse.
   * @param dto - The address data from CreateAddressDto.
   * @param vendor - The current authenticated vendor.
   * @returns The created vendor address.
   */
  @ApiOperation({
    summary: 'Create vendor address',
    description:
      "Creates a new vendor address for the authenticated vendor. Enforces that a vendor can have only one address; if an address already exists, returns a bad request error. Validates vendor existence, requires latitude and longitude, handles location creation or reuse, and uses database transactions for integrity. Logs the address creation event to 'logs/vendor_address_creation.log' for auditing purposes.",
  })
  @ApiResponse({
    status: 201,
    description: 'Address created successfully.',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Latitude and longitude are required, or a vendor address already exists.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Vendor not found.' })
  @Post('addresses')
  async createAddress(
    @Body() dto: CreateAddressDto,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    return await this.vendorAddressService.create(id, dto);
  }

  /**
   * Retrieves the address for the specified vendor.
   * @param vendorId - The ID of the vendor.
   * @param vendor - The current authenticated vendor.
   * @returns The address or null.
   */
  @ApiOperation({
    summary: 'Get vendor address',
    description:
      'Retrieves the single address associated with the authenticated vendor, including location details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Address retrieved successfully.',
    type: Object,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Vendor address not found.' })
  @Get('addresses')
  async getAddress(@CurrentUser() vendor: any) {
    const { id } = vendor;
    return await this.vendorAddressService.getAddressByVendorIdWithLocation(id);
  }

  /**
   * Updates the address for the current vendor.
   * @param dto - The updated address data.
   * @param vendor - The current authenticated vendor.
   * @returns The updated address.
   */
  @ApiOperation({
    summary: 'Update vendor address',
    description:
      "Updates the authenticated vendor's address. If latitude and longitude are provided, updates the associated location and geoPoint. Uses database transactions for integrity.",
  })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully.',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid update data.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  @Put('addresses')
  async updateAddress(
    @Body() dto: UpdateAddressDto,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    return await this.vendorAddressService.updateAddress(id, dto);
  }

  /**
   * Deletes the address for the current vendor.
   * @param vendor - The current authenticated vendor.
   */
  @ApiOperation({
    summary: 'Delete vendor address',
    description:
      "Soft deletes the authenticated vendor's address by setting is_active to false. This allows for potential recovery and maintains data integrity.",
  })
  @ApiResponse({
    status: 200,
    description: 'Address deleted successfully.',
    type: Object,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  @Delete('addresses')
  async deleteAddress(@CurrentUser() vendor: any) {
    const { id } = vendor;
    return await this.vendorAddressService.deleteAddress(id);
  }
}
