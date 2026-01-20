import { Injectable } from '@nestjs/common';
import { SearchQueryDto } from '../dto/search-query.dto';
import { CustomerAddressRetriever } from './customer-address-retriever';
import { ProductRepository } from './product-repository';
import type { IProximitySearchResult } from '../interfaces/search.interfaces';

/**
 * Service for handling proximity-based product searches.
 * Orchestrates address retrieval and product querying within a radius.
 */
@Injectable()
export class ProximitySearchService {
  private readonly DEFAULT_RADIUS_KM = 5;

  constructor(
    private customerAddressRetriever: CustomerAddressRetriever,
    private productRepository: ProductRepository,
  ) {}

  /**
   * Searches for products based on proximity to customer's location.
   * @param query Search query parameters
   * @param customerId Customer's ID
   * @returns Paginated search results with products and distances
   */
  async searchProducts(
    query: SearchQueryDto,
    customerId: string,
  ): Promise<
    | {
        data: IProximitySearchResult[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }
    | { message: string; status: number }
  > {
    const address =
      await this.customerAddressRetriever.getCustomerAddress(customerId);

    if (!address?.location.isServiceable) {
      return {
        status: 503,
        message: 'SERVICE_NOT_AVAILABLE',
      };
    }

    if (!address) {
      // No address found, return empty results
      return {
        data: [],
        pagination: {
          total: 0,
          page: query.page || 1,
          limit: query.limit || 10,
          totalPages: 0,
        },
      };
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const radiusKm = this.DEFAULT_RADIUS_KM; // Could be made configurable

    const { results, total } =
      await this.productRepository.findProductsWithinRadius(
        address,
        radiusKm,
        page,
        limit,
      );

    return {
      data: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
