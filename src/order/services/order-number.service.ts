import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * Service responsible for generating unique order numbers.
 * Follows Single Responsibility Principle by handling only order number generation.
 */
@Injectable()
export class OrderNumberService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generates a unique order number using a counter-based approach.
   * Format: O followed by 6-digit zero-padded number (e.g., O000001).
   * @returns A unique order number string
   */
  async generateOrderNumber(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { type: 'order' },
      update: { lastNumber: { increment: 1 } },
      create: { type: 'order', lastNumber: 1 },
    });

    return 'O' + counter.lastNumber.toString().padStart(6, '0');
  }
}
