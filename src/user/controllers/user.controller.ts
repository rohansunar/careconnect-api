import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ToggleIsProviderDto } from '../dto/toggle-is-provider.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UserService } from '../services/user.service';

@ApiTags('User Profile')
@ApiBearerAuth()
@Controller('user/me')
@Roles('user')
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
  async getProfile(@Req() req: any, @CurrentUser() user: any) {
    const { id } = user;
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
    description: 'Soft delete user profile by setting isActive flag to false.',
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

  @ApiOperation({
    summary: 'Toggle provider status',
    description:
      'Toggle the isProvider boolean field for the authenticated user using the JWT token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider status toggled successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Post('toggle-provider')
  @HttpCode(HttpStatus.OK)
  async toggleIsProvider(
    @CurrentUser() vendor: any,
    @Body() dto: ToggleIsProviderDto,
  ) {
    const userId = vendor.id;
    return this.userService.toggleIsProvider({
      userId,
      isProvider: dto.isProvider,
    });
  }
}
