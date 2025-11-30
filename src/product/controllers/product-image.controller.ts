import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ProductImageService } from '../services/products-image.service';
import { AdminVendorGuard } from 'src/auth/guards/admin-vendor.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  UploadProductImagesDto,
  UploadProductImagesResponseDto,
  DeleteProductImageDto,
  ReorderProductImagesDto,
  ProductImageResponseDto,
} from '../dto/product-image.dto';
import { CurrentVendor } from 'src/auth/decorators/current-vendor.decorator';

@ApiTags('Product Image')
@UseGuards(AdminVendorGuard, RolesGuard)
@Controller('product/image')
export class ProductImageController {
  constructor(private readonly productImageService: ProductImageService) {}

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload product images',
    description:
      'Upload multiple images for a product (max 10 images, appends to existing images)',
  })
  @ApiParam({ name: 'productId', description: 'Product ID', type: String })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
    type: UploadProductImagesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format, size, or validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Invalid image file: File size too large',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Product not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async uploadProductImages(
    @Param('productId') productId: string,
    @Req() req: FastifyRequest,
    @CurrentVendor() vendor: any,
  ): Promise<UploadProductImagesResponseDto> {
    const files: any[] = [];

    // Process multipart form data
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        // Collect file data
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        files.push({
          buffer,
          filename: part.filename,
          mimetype: part.mimetype,
          encoding: part.encoding,
          fields: part.fields,
        });
      }
    }
    const { vendorId, role } = vendor;
    // const vendorId = role === 'vendor' ? vendorId : undefined;
    const user = { id: vendorId, role: role };

    return this.productImageService.uploadProductImages(user, productId, files);
  }

  @Delete(':productId')
  @Roles('admin')  // only admin allowed to delete
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete product image',
    description: 'Delete a specific image from a product',
  })
  @ApiParam({ name: 'productId', description: 'Product ID', type: String })
  @ApiBody({ type: DeleteProductImageDto })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Image deleted successfully' },
        remainingImages: { type: 'number', example: 4 },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product or image not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Product not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async deleteProductImage(
    @Param('productId') productId: string,
    @Body() deleteImageDto: DeleteProductImageDto,
    @CurrentVendor() vendor: any,
  ): Promise<{ message: string; remainingImages: number }> {
    console.log(vendor);
    const vendorId = vendor.role === 'vendor' ? vendor.vendorId : undefined;
    const user = { id: vendor.vendorId, role: vendor.role, vendorId };

    return this.productImageService.deleteProductImage(
      user,
      productId,
      deleteImageDto.imageId,
    );
  }

  @Put(':productId/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reorder product images',
    description:
      'Reorder the images for a product by providing the new order of image IDs',
  })
  @ApiParam({ name: 'productId', description: 'Product ID', type: String })
  @ApiBody({ type: ReorderProductImagesDto })
  @ApiResponse({
    status: 200,
    description: 'Images reordered successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Images reordered successfully' },
        images: {
          type: 'array',
          items: { $ref: '#/components/schemas/ProductImageResponseDto' },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Product not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid image IDs or order',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Invalid image ID format: image_abc',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async reorderProductImages(
    @Param('productId') productId: string,
    @Body() reorderDto: ReorderProductImagesDto,
    @CurrentVendor() vendor: any,
  ): Promise<{ message: string; images: ProductImageResponseDto[] }> {
    const vendorId = vendor.role === 'vendor' ? vendor.vendorId : undefined;
    const user = { id: vendor.vendorId, role: vendor.role, vendorId };

    return this.productImageService.reorderProductImages(
      user,
      productId,
      reorderDto.imageIds,
    );
  }
}
