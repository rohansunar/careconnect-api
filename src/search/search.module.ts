import { Module } from '@nestjs/common';
import { SearchService } from './services/search.service';
import { SearchController } from './controllers/search.controller';
import { ProximitySearchService } from './services/proximity-search.service';
import { UserAddressRetriever } from './services/user-address-retriever';
import { ProductRepository } from './services/product-repository';

@Module({
  imports: [],
  controllers: [SearchController],
  providers: [
    SearchService,
    ProximitySearchService,
    UserAddressRetriever,
    ProductRepository,
  ],
  exports: [SearchService],
})
export class SearchModule {}
