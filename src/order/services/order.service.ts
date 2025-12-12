import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new order with validation.
   * @param dto - The order creation data
   * @returns The created order with relations
   */
  async create(dto: CreateOrderDto) {
    // Validate related entities if provided
    if (dto.customer_id) {
      await this.validateCustomer(dto.customer_id);
    }
    if (dto.vendor_id) {
      await this.validateVendor(dto.vendor_id);
    }
    if (dto.address_id) {
      await this.validateAddress(dto.address_id);
    }
    if (dto.product_id) {
      await this.validateProduct(dto.product_id);
    }

    return this.prisma.order.create({
      data: dto,
      include: {
        customer: true,
        vendor: true,
        address: true,
        product: true,
      },
    });
  }

  /**
   * Retrieves all orders.
   * @returns Array of orders with relations
   */
  async findAll() {
    return this.prisma.order.findMany({
      include: {
        customer: true,
        vendor: true,
        address: true,
        product: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Retrieves a single order by ID.
   * @param id - The unique identifier of the order
   * @returns The order with relations
   */
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        vendor: true,
        address: true,
        product: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Updates an order by ID.
   * @param id - The unique identifier of the order
   * @param dto - The update data
   * @returns The updated order with relations
   */
  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate related entities if provided
    if (dto.customer_id) {
      await this.validateCustomer(dto.customer_id);
    }
    if (dto.vendor_id) {
      await this.validateVendor(dto.vendor_id);
    }
    if (dto.address_id) {
      await this.validateAddress(dto.address_id);
    }
    if (dto.product_id) {
      await this.validateProduct(dto.product_id);
    }

    return this.prisma.order.update({
      where: { id },
      data: dto,
      include: {
        customer: true,
        vendor: true,
        address: true,
        product: true,
      },
    });
  }

  /**
   * Deletes an order by ID.
   * @param id - The unique identifier of the order
   * @returns Confirmation of deletion
   */
  async delete(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.prisma.order.delete({
      where: { id },
    });

    return { message: 'Order deleted successfully' };
  }

  /**
   * Validates that a customer exists.
   * @param customerId - The unique identifier of the customer
   * @throws BadRequestException if customer doesn't exist
   */
  private async validateCustomer(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }
  }

  /**
   * Validates that a vendor exists.
   * @param vendorId - The unique identifier of the vendor
   * @throws BadRequestException if vendor doesn't exist
   */
  private async validateVendor(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }
  }

  /**
   * Validates that an address exists.
   * @param addressId - The unique identifier of the address
   * @throws BadRequestException if address doesn't exist
   */
  private async validateAddress(addressId: string) {
    const address = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new BadRequestException('Address not found');
    }
  }

  /**
   * Validates that a product exists and is active.
   * @param productId - The unique identifier of the product
   * @throws BadRequestException if product doesn't exist or is inactive
   */
  private async validateProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.is_active) {
      throw new BadRequestException('Product not found or unavailable');
    }
  }
}