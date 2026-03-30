import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('User Profile')
@ApiBearerAuth()
@Controller('customer/me')
@Roles('customer')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: 'Get User profile',
    description:
      'Allow user to view their profile information including wallet balance and recent transactions.',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Get('')
  async getProfile(@Req() req: any, @CurrentUser() vendor: any) {
    const { id } = vendor;
    return this.userService.getProfile(id);
  }

  @ApiOperation({
    summary: 'Update user profile',
    description: 'Enable users to update their profile details.',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Put('')
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    return this.userService.updateProfile(id, dto);
  }

  @ApiOperation({
    summary: 'Delete user profile (soft delete)',
    description:
      'Soft delete user profile by setting isActive flag to false.',
  })
  @ApiResponse({ status: 200, description: 'Profile deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Delete('')
  @HttpCode(HttpStatus.OK)
  async deleteProfile(@CurrentUser() vendor: any) {
    const { id } = vendor;
    return this.userService.deleteProfile(id);
  }
}