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
    const products = await this.prisma.product.findMany({
      where: { vendorId: vendorId },
      orderBy: { created_at: 'desc' },
    });

    return products;
  }

  /**
   * Retrieves a single product by ID for a specific vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @param productId - The unique identifier of the product.
   * @returns The product details with vendor information.
   */
  async getProductById(vendorId: string, productId: string) {
    await this.validateVendor(vendorId);
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        vendorId: vendorId,
      },
      include: {
        vendor: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
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
   * Validates subscription_price when is_schedulable is true.
   * Ensures subscription_price is provided and is strictly less than the price.
   * @param isSchedulable - Whether the product is schedulable.
   * @param subscriptionPrice - The subscription price to validate.
   * @param price - The base price to compare against.
   * @throws BadRequestException if validation fails.
   */
  private validateSubscriptionPrice(
    isSchedulable: boolean,
    subscriptionPrice: number | undefined | null,
    price: number,
  ): void {
    if (isSchedulable === true) {
      if (subscriptionPrice === undefined || subscriptionPrice === null) {
        throw new BadRequestException(
          'subscription_price is required when is_schedulable is true',
        );
      }

      if (subscriptionPrice >= price) {
        throw new BadRequestException(
          'subscription_price must be strictly less than the price',
        );
      }
    }
  }

  /**
   * Creates a new vendor product after validating that the base product exists
   * and that the vendor doesn't already have this product.
   * @param vendorId - The unique identifier of the vendor.
   * @param dto - The data transfer object containing product details.
   * @returns The created vendor product details.
   */
  async createProduct(vendorId: string, dto: CreateProductDto) {
    await this.validateVendor(vendorId);

    // Validate subscription_price when is_schedulable is true
    this.validateSubscriptionPrice(
      dto.is_schedulable ?? false,
      dto.subscription_price,
      dto.price,
    );

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
        categoryId: dto.categoryId,
        is_active: dto.is_active || true,
        is_schedulable: dto.is_schedulable || false,
        subscription_price: dto.subscription_price,
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

    // Validate subscription_price when is_schedulable is true
    const priceToCompare = dto.price ?? vendorProduct.price;
    this.validateSubscriptionPrice(
      dto.is_schedulable ?? vendorProduct.is_schedulable,
      dto.subscription_price,
      priceToCompare,
    );

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
