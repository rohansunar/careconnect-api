import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../../src/search/services/search.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { ProductService } from '../../src/product/services/product.service';
import { SearchQueryDto } from '../../src/search/dto/search-query.dto';

describe('SearchService', () => {
  let service: SearchService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockProductService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchProducts', () => {
    it('should return paginated search results', async () => {
      const mockQuery: SearchQueryDto = {
        query: 'water',
        page: 1,
        limit: 10,
      };

      const mockProducts = [
        {
          id: '1',
          name: 'Water Jar',
          description: '20L water jar',
          price: 100,
          deposit: 50,
          is_active: true,
          created_at: new Date(),
          vendorId: 'vendor1',
          categoryId: 'cat1',
          images: [],
          categories: { name: 'Water Jars' },
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.searchProducts(mockQuery);

      expect(result).toEqual({
        data: mockProducts,
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: true,
            OR: [
              { name: { contains: 'water', mode: 'insensitive' } },
              { description: { contains: 'water', mode: 'insensitive' } },
            ],
          }),
          orderBy: { created_at: 'desc' },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should filter by category when categoryId is provided', async () => {
      const mockQuery: SearchQueryDto = {
        categoryId: 'cat1',
        page: 1,
        limit: 10,
      };

      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.searchProducts(mockQuery);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: true,
            categoryId: 'cat1',
          }),
        }),
      );
    });

    it('should filter by price range when minPrice and maxPrice are provided', async () => {
      const mockQuery: SearchQueryDto = {
        minPrice: 50,
        maxPrice: 200,
        page: 1,
        limit: 10,
      };

      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.searchProducts(mockQuery);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: true,
            price: {
              gte: 50,
              lte: 200,
            },
          }),
        }),
      );
    });
  });


});