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
import { AddressService } from '../services/address.service';
import { VendorService } from '../services/vendor.service';
import { CitiesService } from '../../cities/services/cities.service';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { VendorAuthGuard } from '../../auth/guards/vendor-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Vendor Addresses')
@Controller('vendor')
@UseGuards(VendorAuthGuard)
export class AddressController {
  constructor(
    private readonly addressService: AddressService,
    private readonly vendorService: VendorService,
    private readonly citiesService: CitiesService,
  ) {}

  /**
   * Creates a new address for the specified vendor.
   * @param vendorId - The ID of the vendor.
   * @param dto - The address data.
   * @param vendor - The current authenticated vendor.
   * @returns The created address.
   */
  @ApiOperation({
    summary: 'Create vendor address',
    description: 'Creates a new address for the specified vendor.',
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
    const address = await this.addressService.createAddress(id, dto);
    return address;
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
    const address = await this.addressService.getAddressByVendorId(id);
    if (address && address.cityId) {
      const city = await this.citiesService.findById(address.cityId);
      return { ...address, city: city?.name, cityId: undefined };
    }
    return address;
  }

  /**
   * Updates the address with the given ID.
   * @param id - The ID of the address.
   * @param dto - The updated address data.
   * @param vendor - The current authenticated vendor.
   * @returns The updated address.
   */
  @ApiOperation({
    summary: 'Update vendor address',
    description: 'Updates the address with the given ID.',
  })
  @ApiResponse({ status: 200, description: 'Address updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  @Put('addresses/:id')
  async updateAddress(
    @Body() dto: UpdateAddressDto,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    await this.vendorService.validateVendorExists(id);
    const existingAddress = await this.addressService.getAddressById(id);
    if (!existingAddress || existingAddress.vendorId !== id) {
      throw new HttpException(
        'Unauthorized or not found',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const updatedAddress = await this.addressService.updateAddress(
      existingAddress.id,
      dto,
    );
    return updatedAddress;
  }

  /**
   * Deletes the address with the given ID.
   * @param id - The ID of the address.
   * @param vendor - The current authenticated vendor.
   */
  @ApiOperation({
    summary: 'Delete vendor address',
    description: 'Deletes the address with the given ID.',
  })
  @ApiResponse({ status: 204, description: 'Address deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  @Delete('addresses/:id')
  async deleteAddress(@CurrentUser() vendor: any) {
    const { id } = vendor;
    await this.vendorService.validateVendorExists(id);
    const existingAddress = await this.addressService.getAddressById(id);
    if (!existingAddress || existingAddress.vendorId !== vendor.id) {
      throw new HttpException(
        'Unauthorized or not found',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return await this.addressService.deleteAddress(existingAddress.id);
  }
}
