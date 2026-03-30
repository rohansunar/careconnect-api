import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SearchQueryDto } from '../dto/search-query.dto';
import { UserAddressRetriever } from './user-address-retriever';
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
  private readonly DEFAULT_RADIUS_KM = 50;

  constructor(
    private userAddressRetriever: UserAddressRetriever,
    private productRepository: ProductRepository,
  ) {}

  /**
   * Searches for products based on proximity to user's location.
   * @param query Search query parameters
   * @param userId User's ID
   * @returns Paginated search results with products and distances
   * @throws HttpException with 404 if address not found, 503 if service unavailable
   */
  async searchProducts(
    query: SearchQueryDto,
    userId: string,
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
      !userId ||
      typeof userId !== 'string' ||
      userId.trim() === ''
    ) {
      throw new HttpException('Invalid userId', HttpStatus.BAD_REQUEST);
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

    const user =
      await this.userAddressRetriever.getUser(userId);

    if (!user) {
      throw new HttpException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const address =
      await this.userAddressRetriever.getUserAddress(userId);

    if (!address) {
      throw new HttpException(
        'USER_ADDRESS_NOT_FOUND',
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
    const radiusKm = Number(address.serviceRadiusKm) || this.DEFAULT_RADIUS_KM; // Configurable via dependency injection for extension
    console.log('Address', address);
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
