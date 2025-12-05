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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CustomerAddressService } from '../services/customer-address.service';
import { CustomerAuthGuard } from '../../auth/guards/customer-auth.guard';
import { CurrentVendor } from '../../auth/decorators/current-vendor.decorator';
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
  async findAll(@CurrentVendor() customer: any) {
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
  async findOne(@Param('id') id: string, @CurrentVendor() customer: any) {
    return this.customerAddressService.findOne(customer.id, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new customer address',
    description: 'Create a new address for the authenticated customer.',
  })
  @ApiResponse({ status: 201, description: 'Address created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(
    @Body()
    createDto: CreateCustomerAddressDto,
    @CurrentVendor() customer: any,
  ) {
    return this.customerAddressService.create(customer.id, createDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a customer address',
    description: 'Update an existing address for the authenticated customer.',
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
    @CurrentVendor() customer: any,
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
  async delete(@Param('id') id: string, @CurrentVendor() customer: any) {
    return this.customerAddressService.delete(customer.id, id);
  }
}
