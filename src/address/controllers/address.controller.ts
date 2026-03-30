import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateUserAddressDto } from '../dto/create-user-address.dto';
import { UpdateUserAddressDto } from '../dto/update-user-address.dto';
import { AddressService } from '../services/address.service';

@ApiTags('Addresses')
@Controller('addresses')
@Roles('user')
export class AddressController {
  constructor(
    private readonly AddressService: AddressService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all user addresses',
    description:
      'Retrieves all active addresses for the authenticated user, ordered by default status (default first) and creation date (newest first). Includes location details for each address.',
  })
  @ApiResponse({
    status: 200,
    description: 'Addresses retrieved successfully.',
    type: [Object],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findAll(@CurrentUser() user: any) {
    return this.AddressService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific user address',
    description:
      'Retrieves a specific active address by ID for the authenticated user, including location details.',
  })
  @ApiParam({ name: 'id', description: 'Unique identifier of the address' })
  @ApiResponse({
    status: 200,
    description: 'Address retrieved successfully.',
    type: Object,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Address not found or user not found.',
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.AddressService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new user address',
    description:
      "Creates a new address for the authenticated user with robust validation, duplicate checking, and transactional integrity. Validates user existence, ensures latitude and longitude are provided, checks for duplicate addresses (same address, pincode, lat, lng), and handles location serviceability. Uses database transactions for data consistency. If this is the first address, sets it as default. Logs the address creation event to 'logs/user_address_creation.log' for auditing purposes.",
  })
  @ApiBody({
    type: CreateUserAddressDto,
    examples: {
      'home-address': {
        summary: 'Create a home address',
        value: {
          label: 'Home',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          address: '123 Main Street, Apartment 4B',
          lng: 72.8777,
          lat: 19.076,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Address created successfully with transactional integrity ensured.',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Latitude and longitude are required, or an address with the same details already exists.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async create(
    @Body()
    createDto: CreateUserAddressDto,
    @CurrentUser() user: any,
  ) {
    return this.AddressService.create(user.id, createDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a user address',
    description:
      'Updates an existing address for the authenticated user. Performs duplicate checking to prevent identical addresses. If latitude and longitude are provided, updates the associated location.',
  })
  @ApiBody({
    type: UpdateUserAddressDto,
    examples: {
      'office-address': {
        summary: 'Update to an office address',
        value: {
          label: 'Office',
          state: 'Maharashtra',
          address: '456 Business Avenue, Floor 5',
          pincode: '400001',
          lng: 72.8777,
          lat: 19.076,
        },
      },
    },
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the address to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully.',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data or duplicate address.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Address not found or user not found.',
  })
  async update(
    @Param('id') id: string,
    @Body()
    updateDto: UpdateUserAddressDto,
    @CurrentUser() user: any,
  ) {
    return this.AddressService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a user address',
    description:
      'Soft deletes an existing address for the authenticated user by setting is_active to false. This maintains data integrity and allows for potential recovery.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the address to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Address deleted successfully.',
    type: Object,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Address not found or user not found.',
  })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.AddressService.delete(user.id, id);
  }

  @Put(':id/set-default')
  @ApiOperation({
    summary: 'Set a user address as default',
    description:
      'Sets an existing active address as the default for the authenticated user. Automatically unsets the default flag from all other addresses for this user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the address to set as default',
  })
  @ApiResponse({
    status: 200,
    description: 'Address set as default successfully.',
    type: Object,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Address not found or user not found.',
  })
  async setDefaultAddress(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.AddressService.setDefaultAddress(user.id, id);
  }
}
