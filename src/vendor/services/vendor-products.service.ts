import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateVendorProductDto } from '../dto/create-vendor-product.dto';
import { UpdateVendorProductDto } from '../dto/update-vendor-product.dto';

@Injectable()
export class VendorProductsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all active products associated with a specific vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @returns A list of vendor products with their details.
   */
  async getProducts(vendorId: string) {
    const products = await this.prisma.vendorProduct.findMany({
      where: { vendor_id: vendorId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        deposit: true,
        image_url: true,
        product_id: true,
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
  async createProduct(vendorId: string, dto: CreateVendorProductDto) {
    // Check if the base product exists in the database
    const product = await this.prisma.product.findUnique({
      where: { id: dto.product_id },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Check if vendor_product already exists for this product and vendor
    const existing = await this.prisma.vendorProduct.findFirst({
      where: {
        vendor_id: vendorId,
        product_id: dto.product_id,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Vendor product already exists for this product',
      );
    }

    // Create the vendor product with data from the base product and DTO
    const vendorProduct = await this.prisma.vendorProduct.create({
      data: {
        vendor_id: vendorId,
        product_id: dto.product_id,
        name: product.name,
        description: product.description,
        price: dto.price,
        deposit: dto.deposit,
        image_url: product.image_url,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        deposit: true,
        image_url: true,
        product_id: true,
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
    dto: UpdateVendorProductDto,
  ) {
    const vendorProduct = await this.prisma.vendorProduct.findFirst({
      where: {
        id: productId,
        vendor_id: vendorId,
      },
    });

    if (!vendorProduct) {
      throw new NotFoundException('Vendor product not found');
    }

    const updated = await this.prisma.vendorProduct.update({
      where: { id: productId },
      data: dto,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        deposit: true,
        image_url: true,
        product_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
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
    const vendorProduct = await this.prisma.vendorProduct.findFirst({
      where: {
        id: productId,
        vendor_id: vendorId,
      },
    });

    if (!vendorProduct) {
      throw new NotFoundException('Vendor product not found');
    }

    // Soft delete by setting is_active to false
    await this.prisma.vendorProduct.update({
      where: { id: productId },
      data: { is_active: false },
    });

    return { message: 'Vendor product deactivated' };
  }
}
