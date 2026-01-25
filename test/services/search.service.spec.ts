import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../../src/search/services/search.service';
import { ProximitySearchService } from '../../src/search/services/proximity-search.service';
import { SearchQueryDto } from '../../src/search/dto/search-query.dto';

describe('SearchService', () => {
  let service: SearchService;
  let proximitySearchService: ProximitySearchService;

  const mockProximitySearchService = {
    searchProducts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ProximitySearchService,
          useValue: mockProximitySearchService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    proximitySearchService = module.get<ProximitySearchService>(
      ProximitySearchService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchProducts', () => {
    it('should delegate to ProximitySearchService', async () => {
      const mockQuery: SearchQueryDto = {
        page: 1,
        limit: 10,
      };

      const mockCustomer = { id: 'customer-id' };

      const mockResult = {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      mockProximitySearchService.searchProducts.mockResolvedValue(mockResult);

      const result = await service.searchProducts(mockQuery, mockCustomer);

      expect(result).toEqual(mockResult);
      expect(mockProximitySearchService.searchProducts).toHaveBeenCalledWith(
        mockQuery,
        'customer-id',
      );
    });
  });
});
