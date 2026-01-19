import { Module } from '@nestjs/common';
import { SearchService } from './services/search.service';
import { SearchController } from './controllers/search.controller';
import { ProximitySearchService } from './services/proximity-search.service';
import { CustomerAddressRetriever } from './services/customer-address-retriever';
import { ProductRepository } from './services/product-repository';

@Module({
  imports: [],
  controllers: [SearchController],
  providers: [
    SearchService,
    ProximitySearchService,
    CustomerAddressRetriever,
    ProductRepository,
  ],
  exports: [SearchService],
})
export class SearchModule {}
