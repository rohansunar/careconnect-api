import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  HttpException,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VendorAddressService } from '../services/vendor-address.service';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { VendorAuthGuard } from '../../auth/guards/vendor-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { VendorService } from '../../vendor/services/vendor.service';

@ApiTags('Vendor Addresses')
@Controller('vendor')
@UseGuards(VendorAuthGuard)
export class VendorAddressController {
  constructor(
    private readonly vendorAddressService: VendorAddressService,
    private readonly vendorService: VendorService,
  ) {}

  /**
   * Creates a new vendor address, validating the vendor and managing location creation or reuse.
   * @param dto - The address data from CreateAddressDto.
   * @param vendor - The current authenticated vendor.
   * @returns The created vendor address.
   */
  @ApiOperation({
    summary: 'Create vendor address',
    description:
      'Creates a new vendor address, reusing existing locations if a duplicate is found based on address data, or creating a new location otherwise.',
  })
  @ApiResponse({ status: 201, description: 'Address created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Post('addresses')
  async createAddress(
    @Body() dto: CreateAddressDto,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    await this.vendorService.validateVendorExists(id);
    return await this.vendorAddressService.createAddress(id, dto);
  }

  /**
   * Retrieves the address for the specified vendor.
   * @param vendorId - The ID of the vendor.
   * @param vendor - The current authenticated vendor.
   * @returns The address or null.
   */
  @ApiOperation({
    summary: 'Get vendor address',
    description: 'Retrieves the address for the specified vendor.',
  })
  @ApiResponse({ status: 200, description: 'Address retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
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
    description: "Updates the current vendor's address.",
  })
  @ApiResponse({ status: 200, description: 'Address updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  @Put('addresses')
  async updateAddress(
    @Body() dto: UpdateAddressDto,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    await this.vendorService.validateVendorExists(id);
    return await this.vendorAddressService.updateAddress(id, dto);
  }

  /**
   * Deletes the address for the current vendor.
   * @param vendor - The current authenticated vendor.
   */
  @ApiOperation({
    summary: 'Delete vendor address',
    description: "Deletes the current vendor's address.",
  })
  @ApiResponse({ status: 204, description: 'Address deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  @Delete('addresses')
  async deleteAddress(@CurrentUser() vendor: any) {
    const { id } = vendor;
    await this.vendorService.validateVendorExists(id);
    return await this.vendorAddressService.deleteAddress(id);
  }
}
