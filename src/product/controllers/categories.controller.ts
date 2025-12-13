import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CategoriesService } from '../services/categories.service';
import { AdminVendorGuard } from '../../auth/guards/admin-vendor.guard';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(AdminVendorGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Business logic rationale: Allow admins and vendors to view all categories.
   * Security consideration: AdminVendorGuard ensures only authenticated admins or vendors access.
   * Design decision: Returns all categories ordered by creation date.
   */
  @ApiOperation({
    summary: 'Get all categories',
    description: 'Retrieve a list of all categories.',
  })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully.', schema: { example: [{ id: 'cat-1', name: 'Water Jars', created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-01-01T00:00:00.000Z' }, { id: 'cat-2', name: 'Bottles', created_at: '2023-01-02T00:00:00.000Z', updated_at: '2023-01-02T00:00:00.000Z' }] } })
  @ApiResponse({ status: 401, description: 'Unauthorized.', schema: { example: { message: 'Unauthorized' } } })
  @Get('')
  async getCategories() {
    return this.categoriesService.getCategories();
  }

  /**
   * Business logic rationale: Enable admins and vendors to create new categories.
   * Security consideration: AdminVendorGuard ensures only authenticated admins or vendors can create.
   * Design decision: Validates uniqueness of category name.
   */
  @ApiOperation({
    summary: 'Create a new category',
    description: 'Create a new category with a unique name.',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'Category created successfully.', schema: { example: { id: 'cat-1', name: 'Water Jars', created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 400, description: 'Bad request.', schema: { example: { message: 'Category with this name already exists' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized.', schema: { example: { message: 'Unauthorized' } } })
  @Post('')
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  /**
   * Business logic rationale: Allow admins and vendors to update category details.
   * Security consideration: AdminVendorGuard ensures only authenticated admins or vendors can update.
   * Design decision: Partial updates allowed, validates uniqueness if name is changed.
   */
  @ApiOperation({
    summary: 'Update a category',
    description: 'Update an existing category by its ID.',
  })
  @ApiParam({ name: 'id', description: 'The unique identifier of the category' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, description: 'Category updated successfully.', schema: { example: { id: 'cat-1', name: 'Updated Water Jars', created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-01-02T00:00:00.000Z' } } })
  @ApiResponse({ status: 400, description: 'Bad request.', schema: { example: { message: 'Category with this name already exists' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized.', schema: { example: { message: 'Unauthorized' } } })
  @ApiResponse({ status: 404, description: 'Category not found.', schema: { example: { message: 'Category not found' } } })
  @Put(':id')
  async updateCategory(
    @Param('id') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(categoryId, dto);
  }

  /**
   * Business logic rationale: Enable admins and vendors to delete categories.
   * Security consideration: AdminVendorGuard ensures only authenticated admins or vendors can delete.
   * Design decision: Prevents deletion if category is associated with products.
   */
  @ApiOperation({
    summary: 'Delete a category',
    description: 'Delete a category by its ID, if not associated with any products.',
  })
  @ApiParam({ name: 'id', description: 'The unique identifier of the category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully.', schema: { example: { message: 'Category deleted successfully' } } })
  @ApiResponse({ status: 400, description: 'Bad request.', schema: { example: { message: 'Cannot delete category as it is associated with existing products' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized.', schema: { example: { message: 'Unauthorized' } } })
  @ApiResponse({ status: 404, description: 'Category not found.', schema: { example: { message: 'Category not found' } } })
  @Delete(':id')
  async deleteCategory(@Param('id') categoryId: string) {
    return this.categoriesService.deleteCategory(categoryId);
  }
}