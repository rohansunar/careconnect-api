import { Controller, Get, Put, Post, Body, Req, UseGuards } from '@nestjs/common';
import { VendorService } from '../services/vendor.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto';

@Controller('vendors')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  /**
   * Business logic rationale: Allow vendors to view their profile and settings.
   * Security consideration: JWT authentication ensures only authenticated vendors access their data.
   * Design decision: Use 'me' endpoint for self-referential access.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: any) {
    const vendorId = req.user.vendorId;
    return this.vendorService.getProfile(vendorId);
  }

  /**
   * Business logic rationale: Enable vendors to update their profile information.
   * Security consideration: Ownership check via JWT, input validation in service.
   * Design decision: Partial updates allowed, phone validated as E.164.
   */
  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const vendorId = req.user.vendorId;
    return this.vendorService.updateProfile(vendorId, dto);
  }

  /**
   * Business logic rationale: Allow vendors to toggle availability, affecting order assignments.
   * Security consideration: Ownership check ensures vendors only update their status.
   * Design decision: Updates DB and triggers notifications if needed.
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/availability')
  async updateAvailability(@Req() req: any, @Body() dto: UpdateAvailabilityDto) {
    const vendorId = req.user.vendorId;
    return this.vendorService.updateAvailability(vendorId, dto);
  }
}