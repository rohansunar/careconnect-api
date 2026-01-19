import { Injectable, Logger } from '@nestjs/common';
import { SearchQueryDto } from '../dto/search-query.dto';
import { ProximitySearchService } from './proximity-search.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private proximitySearchService: ProximitySearchService) {}

  /**
   * Searches for products based on proximity to customer's location.
   * @param query - Search query DTO containing search parameters
   * @param customer - Customer object with id
   * @returns Paginated list of products with distances
   */
  async searchProducts(query: SearchQueryDto, customer: { id: any }) {
    this.logger.log(
      `Product Search Request with Query: ${query.limit} ${query.page}`,
    );
    return this.proximitySearchService.searchProducts(
      query,
      String(customer.id),
    );
  }
}
