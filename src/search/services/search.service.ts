import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { SearchQueryDto } from '../dto/search-query.dto';
import { ProductService } from '../../product/services/product.service';

@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private productService: ProductService,
  ) {}

  /**
   * Searches for products based on various criteria
   * @param query - Search query DTO containing search parameters
   * @returns Paginated list of products matching the search criteria
   */
  async searchProducts(query: SearchQueryDto) {
    const {
      query: searchTerm,
      categoryId,
      minPrice,
      maxPrice,
      availableOnly,
      vendorId,
      sortBy,
      sortOrder,
      page,
      limit,
    } = query;

    // Build the where clause for the search
    const where: any = {
      is_active: availableOnly !== undefined ? availableOnly : true,
    };

    // Add search term filtering
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Add category filtering
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Add price range filtering
    if (minPrice !== undefined) {
      where.price = { ...where.price, gte: minPrice };
    }

    if (maxPrice !== undefined) {
      where.price = { ...where.price, lte: maxPrice };
    }

    // Add vendor filtering
    if (vendorId) {
      where.vendorId = vendorId;
    }

    // Build the order by clause
    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'asc';
    } else {
      // Default sorting
      orderBy.created_at = 'desc';
    }

    // Calculate pagination with default values
    const currentPage = page || 1;
    const currentLimit = limit || 10;
    const skip = (currentPage - 1) * currentLimit;
    const take = currentLimit;

    // Execute the search query
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          categories: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / currentLimit),
      },
    };
  }

}