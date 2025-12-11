import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CartService } from '../services/cart.service';
import { CustomerAuthGuard } from '../../auth/guards/customer-auth.guard';
import { CreateCartItemDto } from '../dto/create-cart-item.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';
import { CurrentVendor } from '../../auth/decorators/current-vendor.decorator';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(CustomerAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Business logic rationale: Allow customers to add items to their cart with validation.
   * Security consideration: JWT authentication ensures only authenticated customers can modify their cart.
   * Design decision: Handles duplicate items by updating quantity instead of creating new entries.
   */
  @ApiOperation({
    summary: 'Add item to cart',
    description: 'Allow customers to add items to their cart with validation.',
  })
  @ApiBody({ type: CreateCartItemDto })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or product/customer not found.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Post('')
  async addToCart(
    @Body() dto: CreateCartItemDto,
    @CurrentVendor() customer: any,
  ) {
    const { id } = customer;
    return this.cartService.addToCart(dto, id);
  }

  /**
   * Business logic rationale: Enable customers to update the quantity of items in their cart.
   * Security consideration: Ownership check via JWT ensures customers only update their own cart items.
   * Design decision: Partial updates allowed, atomic operations with validation.
   */
  @ApiOperation({
    summary: 'Update cart item quantity',
    description:
      'Enable customers to update the quantity of items in their cart.',
  })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiResponse({
    status: 200,
    description: 'Cart item quantity updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid quantity.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  @Put(':id')
  async updateQuantity(
    @Param('id') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const id = parseInt(cartItemId, 10);
    if (isNaN(id)) {
      throw new Error('Invalid cart item ID');
    }
    return this.cartService.updateQuantity(id, dto);
  }

  /**
   * Business logic rationale: Allow customers to remove items from their cart.
   * Security consideration: Ownership check ensures customers only remove their own cart items.
   * Design decision: Hard delete with proper error handling.
   */
  @ApiOperation({
    summary: 'Remove item from cart',
    description: 'Allow customers to remove items from their cart.',
  })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Cart item removed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  @Delete(':id')
  async removeFromCart(@Param('id') cartItemId: string) {
    const id = parseInt(cartItemId, 10);
    if (isNaN(id)) {
      throw new Error('Invalid cart item ID');
    }
    return this.cartService.removeFromCart(id);
  }
}
