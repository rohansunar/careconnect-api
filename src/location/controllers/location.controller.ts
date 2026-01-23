import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { LocationService } from '../services/location.service';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { Location } from '@prisma/client';

@ApiTags('Admin Locations')
@Controller('admin/locations')
@UseGuards(RolesGuard)
@Roles('admin')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new location' })
  @ApiResponse({ status: 201, description: 'Location created successfully' })
  @ApiBody({ type: CreateLocationDto })
  async create(@Body() dto: CreateLocationDto): Promise<Location> {
    return this.locationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all locations' })
  @ApiResponse({ status: 200, description: 'Locations retrieved successfully' })
  async findAll(): Promise<Location[]> {
    return this.locationService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiParam({ name: 'id', description: 'Location ID' })
  @ApiResponse({ status: 200, description: 'Location retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async findOne(@Param('id') id: string): Promise<Location> {
    return this.locationService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update location by ID' })
  @ApiParam({ name: 'id', description: 'Location ID' })
  @ApiBody({ type: UpdateLocationDto })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<Location> {
    return this.locationService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete location by ID' })
  @ApiParam({ name: 'id', description: 'Location ID' })
  @ApiResponse({ status: 200, description: 'Location deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete location associated with addresses',
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.locationService.delete(id);
    return { message: 'Location deleted successfully' };
  }

  @Patch(':id/toggle-serviceable')
  @ApiOperation({ summary: 'Toggle isServiceable for location' })
  @ApiParam({ name: 'id', description: 'Location ID' })
  @ApiResponse({
    status: 200,
    description: 'Serviceable status toggled successfully',
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async toggleServiceable(@Param('id') id: string): Promise<Location> {
    return this.locationService.toggleServiceable(id);
  }
}
