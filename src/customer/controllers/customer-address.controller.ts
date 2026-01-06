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
import { CustomerAuthGuard } from '../../auth/guards/customer-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateCustomerAddressDto } from '../dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from '../dto/update-customer-address.dto';

@ApiTags('Customer Addresses')
@Controller('customer/addresses')
@UseGuards(CustomerAuthGuard)
export class CustomerAddressController {
  constructor(
    private readonly customerAddressService: CustomerAddressService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all customer addresses',
    description: 'Retrieve all addresses for the authenticated customer.',
  })
  @ApiResponse({
    status: 200,
    description: 'Addresses retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@CurrentUser() customer: any) {
    return this.customerAddressService.findAll(customer.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific customer address',
    description:
      'Retrieve a specific address by ID for the authenticated customer.',
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  async findOne(@Param('id') id: string, @CurrentUser() customer: any) {
    return this.customerAddressService.findOne(customer.id, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new customer address',
    description: 'Create a new address for the authenticated customer.',
  })
  @ApiBody({
    type: CreateCustomerAddressDto,
    examples: {
      'home-address': {
        summary: 'Create a home address',
        value: {
          label: 'Home',
          address: '123 Main Street, Apartment 4B',
          cityId: '550e8400-e29b-41d4-a716-446655440000',
          zipCode: '110001',
          location: { lat: 28.6139, lng: 77.209 },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Address created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
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
    description: 'Update an existing address for the authenticated customer.',
  })
  @ApiBody({
    type: UpdateCustomerAddressDto,
    examples: {
      'office-address': {
        summary: 'Update to an office address',
        value: {
          label: 'Office',
          address: '456 Business Avenue, Floor 5',
          cityId: '550e8400-e29b-41d4-a716-446655440001',
          pincode: '400001',
          location: { lat: 19.076, lng: 72.8777 },
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
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
    description: 'Delete an existing address for the authenticated customer.',
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  async delete(@Param('id') id: string, @CurrentUser() customer: any) {
    return this.customerAddressService.delete(customer.id, id);
  }

  @Put(':id/set-default')
  @ApiOperation({
    summary: 'Set a customer address as default',
    description:
      'Set an existing address as the default for the authenticated customer.',
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Address set as default successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  async setDefaultAddress(
    @Param('id') id: string,
    @CurrentUser() customer: any,
  ) {
    return this.customerAddressService.setDefaultAddress(customer.id, id);
  }
}
