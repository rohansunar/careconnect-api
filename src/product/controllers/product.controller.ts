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
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Product')
@Controller('products')
@Roles('vendor')
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
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully.',
    schema: {
      example: [
        {
          id: 'prod-123',
          vendorId: 'vend-456',
          name: '20L Water Jar',
          description: 'High quality water jar',
          price: 100.0,
          deposit: 50.0,
          categoryId: 'cat-1',
          is_active: true,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          vendor: {
            id: 'vend-456',
            name: 'ABC Vendors',
            business_name: 'John Doe',
            phone: '1234567890',
            email: 'vendor@example.com',
            address: '123 Main St, City, State',
            cityId: 'city-1',
            state: 'State',
            pincode: '123456',
            lng: 12.34,
            lat: 56.78,
            service_radius_m: 5000,
            is_active: true,
            is_available_today: true,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    schema: { example: { message: 'Unauthorized' } },
  })
  @Get('')
  async getProducts(@Req() req: any, @CurrentUser() vendor: any) {
    const { id } = vendor;
    return this.productService.getProducts(id);
  }

  /**
   * Enable vendors to add new products to their catalog.
   * Security consideration: Ownership check via JWT, validation in service.
   * Design decision: Creates vendor_product row with product details.
   */
  @ApiOperation({
    summary: 'Create vendor product',
    description: 'Enable vendors to add new products to their catalog.',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully.',
    schema: {
      example: {
        id: 'prod-123',
        name: '20L Water Jar',
        created_at: '2023-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request.',
    schema: { example: { message: 'Bad request' } },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    schema: { example: { message: 'Unauthorized' } },
  })
  @Post('')
  async createProduct(
    @Req() req: any,
    @Body() dto: CreateProductDto,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    return this.productService.createProduct(id, dto);
  }

  /**
   * Allow vendors to retrieve a single product by ID.
   * Security consideration: Ensures the product belongs to the authenticated vendor.
   * Design decision: Includes vendor details in the response.
   */
  @ApiOperation({
    summary: 'Get vendor product by ID',
    description:
      'Retrieve a single product by its ID, ensuring it belongs to the authenticated vendor.',
  })
  @ApiParam({
    name: 'productId',
    description: 'The unique identifier of the product',
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully.',
    schema: {
      example: {
        id: 'prod-123',
        vendorId: 'vend-456',
        name: '20L Water Jar',
        description: 'High quality water jar',
        price: 100.0,
        deposit: 50.0,
        categoryId: 'cat-1',
        is_active: true,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        vendor: {
          id: 'vend-456',
          name: 'ABC Vendors',
          business_name: 'John Doe',
          phone: '1234567890',
          email: 'vendor@example.com',
          address: '123 Main St, City, State',
          cityId: 'city-1',
          state: 'State',
          pincode: '123456',
          lng: 12.34,
          lat: 56.78,
          service_radius_m: 5000,
          is_active: true,
          is_available_today: true,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found.',
    schema: { example: { message: 'Product not found' } },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    schema: { example: { message: 'Unauthorized' } },
  })
  @Get(':productId')
  async getProductById(
    @Param('productId') productId: string,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    return this.productService.getProductById(id, productId);
  }

  /**
   * Allow vendors to update product pricing, deposit, or availability.
   * Security consideration: Ownership check ensures vendors only update their products.
   * Design decision: Partial updates allowed, atomic operations.
   */
  @ApiOperation({
    summary: 'Update vendor product',
    description:
      'Allow vendors to update product pricing, deposit, or availability.',
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully.',
    schema: {
      example: {
        id: 'prod-123',
        vendorId: 'vend-456',
        name: '20L Water Jar',
        description: 'High quality water jar',
        price: 150.0,
        deposit: 75.0,
        categoryId: 'cat-1',
        is_active: true,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request.',
    schema: { example: { message: 'Bad request' } },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    schema: { example: { message: 'Unauthorized' } },
  })
  @Put(':productId')
  async updateProduct(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    return this.productService.updateProduct(id, productId, dto);
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
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully.',
    schema: { example: { message: 'Vendor product deactivated' } },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found.',
    schema: { example: { message: 'Product not found' } },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    schema: { example: { message: 'Unauthorized' } },
  })
  @Delete(':productId')
  async deleteProduct(
    @Req() req: any,
    @Param('productId') productId: string,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    return this.productService.deleteProduct(id, productId);
  }

  /**
   * Enable vendors to restore deactivated products from their catalog.
   * Security consideration: Ownership check prevents unauthorized restoration.
   * Design decision: Soft-restore by setting is_active to true.
   */
  @ApiOperation({
    summary: 'Restore vendor product',
    description:
      'Enable vendors to restore deactivated products from their catalog.',
  })
  @ApiResponse({
    status: 200,
    description: 'Product restored successfully.',
    schema: { example: { message: 'Vendor product restored' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request.',
    schema: { example: { message: 'Product is already active' } },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    schema: { example: { message: 'Unauthorized' } },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found.',
    schema: { example: { message: 'Product not found' } },
  })
  @Put(':productId/restore')
  async restoreProduct(
    @Req() req: any,
    @Param('productId') productId: string,
    @CurrentUser() vendor: any,
  ) {
    const { id } = vendor;
    return this.productService.restoreProduct(id, productId);
  }
}
