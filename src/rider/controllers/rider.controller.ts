import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RiderService } from '../services/rider.service';
import { VendorAuthGuard } from '../../auth/guards/vendor-auth.guard';
import { CreateRiderDto } from '../dto/create-rider.dto';

@ApiTags('Riders')
@Controller('riders')
@UseGuards(VendorAuthGuard)
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  /**
   * Business logic rationale: Allow vendors to onboard new riders.
   * Security consideration: Vendor authentication ensures only authenticated vendors can create riders.
   * Design decision: Endpoint for creating a new rider.
   */
  @ApiOperation({
    summary: 'Create a new rider',
    description: 'Allow vendors to onboard new riders.',
  })
  @ApiResponse({ status: 201, description: 'Rider created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Post()
  async createRider(@Body() dto: CreateRiderDto) {
    return this.riderService.createRider(dto);
  }
}