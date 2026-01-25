import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from '../../src/search/controllers/search.controller';
import { SearchService } from '../../src/search/services/search.service';
import { SearchQueryDto } from '../../src/search/dto/search-query.dto';

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: SearchService;

  const mockSearchService = {
    searchProducts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    searchService = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchProducts', () => {
    it('should call searchService.searchProducts with query DTO and customer', async () => {
      const queryDto: SearchQueryDto = {
        page: 1,
        limit: 10,
      };

      const mockCustomer = { id: 'customer-123' };

      const mockResult = {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      mockSearchService.searchProducts.mockResolvedValue(mockResult);

      const result = await controller.searchProducts(queryDto, mockCustomer);

      expect(result).toEqual(mockResult);
      expect(mockSearchService.searchProducts).toHaveBeenCalledWith(
        queryDto,
        mockCustomer,
      );
    });
  });
});
