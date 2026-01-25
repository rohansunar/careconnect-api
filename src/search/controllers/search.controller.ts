import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import { SearchQueryDto } from '../dto/search-query.dto';
import { CustomerAuthGuard } from '../../auth/guards/customer-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Search')
@Controller('search')
@UseGuards(CustomerAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Proximity-based product search endpoint
    * Business logic rationale: Provide customers with ability to search products by proximity
    * Security consideration: Customer authentication required
    * Design decision: Supports pagination for proximity search
    */
   @ApiOperation({
     summary: 'Search products by proximity',
     description:
       "Search products based on proximity to customer's location, with pagination.",
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
     description: 'CUSTOMER_ADDRESS_NOT_FOUND',
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
    @CurrentUser() customer: any,
  ) {
    return this.searchService.searchProducts(queryDto, customer);
  }
}
