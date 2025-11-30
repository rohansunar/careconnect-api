import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class VendorProductsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all active products associated with a specific vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @returns A list of vendor products with their details.
   */
  async getProducts(vendorId: string) {
    const products = await this.prisma.product.findMany({
      where: { vendorId: vendorId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        deposit: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    return products;
  }

  /**
   * Creates a new vendor product after validating that the base product exists
   * and that the vendor doesn't already have this product.
   * @param vendorId - The unique identifier of the vendor.
   * @param dto - The data transfer object containing product details (product_id, price, deposit).
   * @returns The created vendor product details.
   */
  async createProduct(vendorId: string, dto: CreateProductDto) {
    // Check if vendor_product already exists for this product and vendor
    const existing = await this.prisma.product.findFirst({
      where: {
        vendorId: vendorId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Product already exists for this product name',
      );
    }

    // check if category exists
    const category = await this.prisma.categories.findFirst({
      where: {
        id: dto.categoryId,
      },
    });

    if (!category) {
      throw new BadRequestException('Category does not exist');
    }

    // Create the vendor product with data from the base product and DTO
    const vendorProduct = await this.prisma.product.create({
      data: {
        vendorId: vendorId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        deposit: dto.deposit,
        categoryId: dto.categoryId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        deposit: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    return vendorProduct;
  }

  /**
   * Updates an existing vendor product for a specific vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @param productId - The unique identifier of the vendor product.
   * @param dto - The data transfer object containing fields to update.
   * @returns The updated vendor product details.
   */
  async updateProduct(
    vendorId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    const vendorProduct = await this.prisma.product.findFirst({
      where: {
        id: productId,
        vendorId: vendorId,
      },
    });

    if (!vendorProduct) {
      throw new NotFoundException('Vendor product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: dto,
    });

    return updated;
  }

  /**
   * Deactivates a vendor product (soft delete) for a specific vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @param productId - The unique identifier of the vendor product.
   * @returns A success message indicating deactivation.
   */
  async deleteProduct(vendorId: string, productId: string) {
    const vendorProduct = await this.prisma.product.findFirst({
      where: {
        id: productId,
        vendorId: vendorId,
      },
    });

    if (!vendorProduct) {
      throw new NotFoundException('Vendor product not found');
    }

    // Soft delete by setting is_active to false
    await this.prisma.product.update({
      where: { id: productId },
      data: { is_active: false },
    });

    return { message: 'Vendor product deactivated' };
  }
}
