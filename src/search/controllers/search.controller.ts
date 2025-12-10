import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import { SearchQueryDto } from '../dto/search-query.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Basic product search endpoint
   * Business logic rationale: Provide customers with ability to search and filter products
   * Security consideration: Public endpoint, no authentication required
   * Design decision: Supports pagination and multiple filter criteria
   */
  @ApiOperation({
    summary: 'Search products',
    description:
      'Search and filter products based on various criteria including name, category, price range, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results with pagination information.',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search term for product name or description',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'availableOnly',
    required: false,
    description: 'Filter only available products',
  })
  @ApiQuery({
    name: 'vendorId',
    required: false,
    description: 'Filter by vendor ID',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field (name, price, created_at)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (asc, desc)',
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
  async searchProducts(@Query() queryDto: SearchQueryDto) {
    return this.searchService.searchProducts(queryDto);
  }

}