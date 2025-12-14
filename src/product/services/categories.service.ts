import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all categories.
   * @returns A list of all categories.
   */
  async getCategories() {
    return this.prisma.categories.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Creates a new category, ensuring the name is unique.
   * @param dto - The data transfer object containing category details.
   * @returns The created category details.
   */
  async createCategory(dto: CreateCategoryDto) {
    // Check if category with this name already exists
    const existing = await this.prisma.categories.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Category with this name already exists');
    }

    const category = await this.prisma.categories.create({
      data: {
        name: dto.name,
      },
    });

    return category;
  }

  /**
   * Updates an existing category by ID, ensuring the name remains unique.
   * @param categoryId - The unique identifier of the category.
   * @param dto - The data transfer object containing fields to update.
   * @returns The updated category details.
   */
  async updateCategory(categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.categories.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name && dto.name !== category.name) {
      // Check if new name is unique
      const existing = await this.prisma.categories.findUnique({
        where: { name: dto.name },
      });

      if (existing) {
        throw new BadRequestException('Category with this name already exists');
      }
    }

    const updated = await this.prisma.categories.update({
      where: { id: categoryId },
      data: dto,
    });

    return updated;
  }

  /**
   * Deletes a category by ID, but only if no products are associated with it.
   * @param categoryId - The unique identifier of the category.
   * @returns A success message indicating deletion.
   */
  async deleteCategory(categoryId: string) {
    const category = await this.prisma.categories.findUnique({
      where: { id: categoryId },
      include: { products: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.products.length > 0) {
      throw new BadRequestException(
        'Cannot delete category as it is associated with existing products',
      );
    }

    await this.prisma.categories.delete({
      where: { id: categoryId },
    });

    return { message: 'Category deleted successfully' };
  }
}
