import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class RiderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new rider with the provided data.
   * @param data - The rider data to create (name, phone, email, address).
   * @returns The created rider data.
   */
  async createRider(data: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  }) {
    // Check if phone number already exists
    const existingRider = await this.prisma.rider.findUnique({
      where: { phone: data.phone },
    });

    if (existingRider) {
      throw new BadRequestException('Rider with this phone number already exists');
    }

    // Validate phone number format if provided (E.164 international format)
    if (!/^\+[1-9]\d{1,14}$/.test(data.phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const rider = await this.prisma.rider.create({
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        created_at: true,
      },
    });

    return rider;
  }
}