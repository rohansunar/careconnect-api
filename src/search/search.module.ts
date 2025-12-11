import { Module } from '@nestjs/common';
import { SearchController } from './controllers/search.controller';
import { SearchService } from './services/search.service';
import { ProductService } from '../product/services/product.service';

@Module({
  imports: [],
  controllers: [SearchController],
  providers: [SearchService, ProductService],
  exports: [SearchService],
})
export class SearchModule {}
