import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
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
  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_LIMIT = 10;
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
   * @throws HttpException with 404 if address not found, 503 if service unavailable
   */
  async searchProducts(
    query: SearchQueryDto,
    customerId: string,
  ): Promise<{
    data: IProximitySearchResult[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    // Input validation
    if (
      !customerId ||
      typeof customerId !== 'string' ||
      customerId.trim() === ''
    ) {
      throw new HttpException('Invalid customerId', HttpStatus.BAD_REQUEST);
    }
    if (
      query.page !== undefined &&
      (query.page < 1 || !Number.isInteger(query.page))
    ) {
      throw new HttpException(
        'Invalid page: must be a positive integer',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      query.limit !== undefined &&
      (query.limit < 1 || !Number.isInteger(query.limit))
    ) {
      throw new HttpException(
        'Invalid limit: must be a positive integer',
        HttpStatus.BAD_REQUEST,
      );
    }

    const customer =
      await this.customerAddressRetriever.getCustomer(customerId);

    if (!customer) {
      throw new HttpException('CUSTOMER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const address =
      await this.customerAddressRetriever.getCustomerAddress(customerId);

    if (!address) {
      throw new HttpException(
        'CUSTOMER_ADDRESS_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!address.isServiceable) {
      throw new HttpException(
        'SERVICE_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const page = query.page ?? this.DEFAULT_PAGE;
    const limit = query.limit ?? this.DEFAULT_LIMIT;
    const radiusKm = this.DEFAULT_RADIUS_KM; // Configurable via dependency injection for extension

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
