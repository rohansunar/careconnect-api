import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all active products associated with a specific vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @returns A list of vendor products with their details.
   */
  async getProducts(vendorId: string) {
    await this.validateVendor(vendorId);
    console.log("vendorId", vendorId)
    const products = await this.prisma.product.findMany({
      where: { vendorId: vendorId },
      include: {
        vendor: true,
      },
    });

    return products;
  }

  /**
   * Validates if a vendor exists in the database.
   * @param vendorId - The unique identifier of the vendor.
   * @throws NotFoundException if the vendor does not exist.
   */
  async validateVendor(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
  }

  /**
   * Creates a new vendor product after validating that the base product exists
   * and that the vendor doesn't already have this product.
   * @param vendorId - The unique identifier of the vendor.
   * @param dto - The data transfer object containing product details (product_id, price, deposit).
   * @returns The created vendor product details.
   */
  async createProduct(vendorId: string, dto: CreateProductDto) {
    await this.validateVendor(vendorId);
    // Check if vendor_product already exists for this product and vendor
    const existing = await this.prisma.product.findFirst({
      where: {
        vendorId: vendorId,
        name: dto.name,
        categoryId: dto.categoryId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Product already exists for this product name and Category',
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
        created_at: true,
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
    await this.validateVendor(vendorId);
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
    await this.validateVendor(vendorId);
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

  /**
   * Restores a deactivated vendor product for a specific vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @param productId - The unique identifier of the vendor product.
   * @returns A success message indicating restoration.
   */
  async restoreProduct(vendorId: string, productId: string) {
    await this.validateVendor(vendorId);
    const vendorProduct = await this.prisma.product.findFirst({
      where: {
        id: productId,
        vendorId: vendorId,
      },
    });

    if (!vendorProduct) {
      throw new NotFoundException('Vendor product not found');
    }

    if (vendorProduct.is_active) {
      throw new BadRequestException('Product is already active');
    }

    // Restore by setting is_active to true
    await this.prisma.product.update({
      where: { id: productId },
      data: { is_active: true },
    });

    return { message: 'Vendor product restored' };
  }
}
