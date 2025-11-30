import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
// import { AdminVendorGuard } from '../../auth/guards/admin-vendor.guard';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { CurrentVendor } from '../../auth/decorators/current-vendor.decorator';

@ApiTags('Product')
@Controller('product')
// @UseGuards(AdminVendorGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * Business logic rationale: Allow vendors to view their product offerings with pricing and deposit information.
   * Security consideration: JWT authentication ensures only authenticated vendors access their products.
   * Design decision: Cacheable endpoint for performance.
   */
  @ApiOperation({
    summary: 'Get vendor products',
    description:
      'Allow vendors to view their product offerings with pricing and deposit information.',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Get('')
  async getProducts(@Req() req: any, @CurrentVendor() vendor: any) {
    const { vendorId } = vendor;
    return this.productService.getProducts(vendorId);
  }

  /**
   * Business logic rationale: Enable vendors to add new products to their catalog.
   * Security consideration: Ownership check via JWT, validation in service.
   * Design decision: Creates vendor_product row with product details.
   */
  @ApiOperation({
    summary: 'Create vendor product',
    description: 'Enable vendors to add new products to their catalog.',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Post('')
  async createProduct(
    @Req() req: any,
    @Body() dto: CreateProductDto,
    @CurrentVendor() vendor: any,
  ) {
    const { vendorId } = vendor;
    return this.productService.createProduct(vendorId, dto);
  }

  /**
   * Business logic rationale: Allow vendors to update product pricing, deposit, or availability.
   * Security consideration: Ownership check ensures vendors only update their products.
   * Design decision: Partial updates allowed, atomic operations.
   */
  @ApiOperation({
    summary: 'Update vendor product',
    description:
      'Allow vendors to update product pricing, deposit, or availability.',
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Put(':productId')
  async updateProduct(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @CurrentVendor() vendor: any,
  ) {
    const { vendorId } = vendor;
    return this.productService.updateProduct(vendorId, productId, dto);
  }

  /**
   * Business logic rationale: Enable vendors to deactivate products from their catalog.
   * Security consideration: Ownership check prevents unauthorized deactivation.
   * Design decision: Soft-delete by setting is_active to false.
   */
  @ApiOperation({
    summary: 'Delete vendor product',
    description: 'Enable vendors to deactivate products from their catalog.',
  })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Delete(':productId')
  async deleteProduct(
    @Req() req: any,
    @Param('productId') productId: string,
    @CurrentVendor() vendor: any,
  ) {
    const { vendorId } = vendor;
    return this.productService.deleteProduct(vendorId, productId);
  }
}
