import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves the profile information for a specific vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @returns The vendor's profile data including id, name, phone, email, address, and availability details.
   */
  async getProfile(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    return vendor;
  }

  /**
   * Updates the profile information for a specific vendor with validation.
   * @param vendorId - The unique identifier of the vendor.
   * @param data - The fields to update (name, phone, email).
   * @returns The updated vendor's profile data.
   */
  async updateProfile(
    vendorId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
    },
  ) {
    // Validate phone number format if provided (E.164 international format)
    if (data.phone && !/^\+[1-9]\d{1,14}$/.test(data.phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const { ...updateData } = data;

    return await this.prisma.vendor.update({
      where: { id: vendorId },
      data: updateData,
      include: {
        address: true,
      },
    });
  }

  /**
   * Updates the availability status for a specific vendor.
   * @param vendorId - The unique identifier of the vendor.
   * @param data - The availability fields to update (is_active, is_available_today).
   * @returns The updated vendor's profile data.
   */
  async updateAvailability(
    vendorId: string,
    data: {
      is_available_today?: boolean;
    },
  ) {
    return await this.prisma.vendor.update({
      where: { id: vendorId }, data
    });
  }

  /**
   * Validates that a vendor exists by ID.
   * @param vendorId - The unique identifier of the vendor.
   * @throws NotFoundException if the vendor does not exist.
   */
  async validateVendorExists(vendorId: string): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
  }

  /**
   * Validates that a vendor exists.
   * @param vendorId - The unique identifier of the vendor
   * @throws BadRequestException if vendor doesn't exist
   */
  async validateVendor(vendorId: string): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }
  }

  /**
   * Validates that a product exists and is active.
   * @param productId - The unique identifier of the product
   * @throws BadRequestException if product doesn't exist or is inactive
   */
  async validateProduct(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.is_active) {
      throw new BadRequestException('Product not found or unavailable');
    }
  }
}
