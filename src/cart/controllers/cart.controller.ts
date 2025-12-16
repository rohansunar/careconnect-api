import {
  Controller,
  Get,
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
import { CheckoutRequestDto, CheckoutResponseDto } from '../dto/checkout.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

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
    @CurrentUser() customer: any,
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
    return this.cartService.updateQuantity(cartItemId, dto);
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
    return this.cartService.removeFromCart(cartItemId);
  }

  /**
   * Business logic rationale: Retrieve the authenticated user's cart with detailed item information.
   * Security consideration: JWT authentication ensures only the authenticated customer can access their cart.
   * Design decision: Returns empty array if cart is empty, includes all necessary item details.
   */
  @ApiOperation({
    summary: 'Get user cart',
    description:
      "Retrieve the authenticated user's cart items with detailed information including IDs, names, quantities, prices, and deposits.",
  })
  @ApiResponse({
    status: 200,
    description: 'Cart items retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Get()
  async getCart(@CurrentUser() customer: any) {
    const { id } = customer;
    return this.cartService.getCartItems(id);
  }

  /**
   * Business logic rationale: Generate a preview of the order summary based on current cart contents and delivery address.
   * Security consideration: JWT authentication ensures only the authenticated customer can preview their cart.
   * Design decision: Groups items by vendor, calculates totals, validates delivery address, returns structured preview without creating orders.
   */
  @ApiOperation({
    summary: 'Generate checkout preview',
    description:
      'Generate a preview of the order summary including itemized breakdown, vendor grouping, subtotals, and delivery address validation.',
  })
  @ApiBody({ type: CheckoutRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Checkout preview generated successfully.',
    type: CheckoutResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid address or empty cart.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Post('checkout')
  async generateCheckout(
    @Body() dto: CheckoutRequestDto,
    @CurrentUser() customer: any,
  ) {
    const { id } = customer;
    return this.cartService.generateCheckout(dto, id);
  }
}
