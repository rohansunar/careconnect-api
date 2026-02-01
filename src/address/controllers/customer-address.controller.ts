import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CustomerAddressService } from '../services/customer-address.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateCustomerAddressDto } from '../dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from '../dto/update-customer-address.dto';

@ApiTags('Customer Addresses')
@Controller('customer/addresses')
@Roles('customer')
export class CustomerAddressController {
  constructor(
    private readonly customerAddressService: CustomerAddressService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all customer addresses',
    description:
      'Retrieves all active addresses for the authenticated customer, ordered by default status (default first) and creation date (newest first). Includes location details for each address.',
  })
  @ApiResponse({
    status: 200,
    description: 'Addresses retrieved successfully.',
    type: [Object],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async findAll(@CurrentUser() customer: any) {
    return this.customerAddressService.findAll(customer.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific customer address',
    description:
      'Retrieves a specific active address by ID for the authenticated customer, including location details.',
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
    description: 'Address not found or customer not found.',
  })
  async findOne(@Param('id') id: string, @CurrentUser() customer: any) {
    return this.customerAddressService.findOne(customer.id, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new customer address',
    description:
      "Creates a new address for the authenticated customer with robust validation, duplicate checking, and transactional integrity. Validates customer existence, ensures latitude and longitude are provided, checks for duplicate addresses (same address, pincode, lat, lng), and handles location serviceability. Uses database transactions for data consistency. If this is the first address, sets it as default. Logs the address creation event to 'logs/customer_address_creation.log' for auditing purposes.",
  })
  @ApiBody({
    type: CreateCustomerAddressDto,
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
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async create(
    @Body()
    createDto: CreateCustomerAddressDto,
    @CurrentUser() customer: any,
  ) {
    return this.customerAddressService.create(customer.id, createDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a customer address',
    description:
      'Updates an existing address for the authenticated customer. Performs duplicate checking to prevent identical addresses. If latitude and longitude are provided, updates the associated location.',
  })
  @ApiBody({
    type: UpdateCustomerAddressDto,
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
    description: 'Address not found or customer not found.',
  })
  async update(
    @Param('id') id: string,
    @Body()
    updateDto: UpdateCustomerAddressDto,
    @CurrentUser() customer: any,
  ) {
    return this.customerAddressService.update(customer.id, id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a customer address',
    description:
      'Soft deletes an existing address for the authenticated customer by setting is_active to false. This maintains data integrity and allows for potential recovery.',
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
    description: 'Address not found or customer not found.',
  })
  async delete(@Param('id') id: string, @CurrentUser() customer: any) {
    return this.customerAddressService.delete(customer.id, id);
  }

  @Put(':id/set-default')
  @ApiOperation({
    summary: 'Set a customer address as default',
    description:
      'Sets an existing active address as the default for the authenticated customer. Automatically unsets the default flag from all other addresses for this customer.',
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
    description: 'Address not found or customer not found.',
  })
  async setDefaultAddress(
    @Param('id') id: string,
    @CurrentUser() customer: any,
  ) {
    return this.customerAddressService.setDefaultAddress(customer.id, id);
  }
}
