import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SearchQueryDto } from '../dto/search-query.dto';
import { SearchService } from '../services/search.service';

@ApiTags('Search')
@Controller('search')
@Roles('user')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Proximity-based product search endpoint
   * Business logic rationale: Provide users with ability to search products by proximity
   * Security consideration: User authentication required
   * Design decision: Supports pagination for proximity search
   */
  @ApiOperation({
    summary: 'Search products by proximity',
    description:
      "Search products based on proximity to user's location, with pagination.",
  })
  @ApiResponse({
    status: 200,
    description:
      'Proximity search results with products (including distances) and pagination information.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'USER_NOT_FOUND',
  })
  @ApiResponse({
    status: 404,
    description: 'USER_ADDRESS_NOT_FOUND',
  })
  @ApiResponse({
    status: 503,
    description: 'SERVICE_UNAVAILABLE',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
  })
  @Get('products')
  async searchProducts(
    @Query() queryDto: SearchQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.searchService.searchProducts(queryDto, user);
  }
}
