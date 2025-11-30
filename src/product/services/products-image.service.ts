import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Product } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { ImageProcessingService } from '../../common/services/image-processing.service';
import { S3Service } from '../../common/services/s3.service';
import {
  UploadProductImagesResponseDto,
  ProductImageResponseDto,
  UploadProductImagesDto,
  DeleteProductImageDto,
  ReorderProductImagesDto,
} from '../dto/product-image.dto';

interface UploadedFile {
  buffer: Buffer;
  filename: string;
  mimetype?: string;
  size?: number;
}

@Injectable()
export class ProductImageService {
  private readonly DEFAULT_PAGE_LIMIT = 10;
  private readonly DEFAULT_PAGE = 1;
  private readonly MAX_PRODUCT_IMAGES = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Builds a query object with role-based filtering
   */
  private buildRoleBasedQuery(
    baseQuery: any,
    user: { id: string; role: string; vendorId?: string },
  ): any {
    const { role, id } = user;
    if (role === 'vendor') {
      if (!id) {
        throw new BadRequestException('Vendor ID not found for user');
      }
      baseQuery.vendorId = id;
    }
    return baseQuery;
  }

  /**
   * Validates that a product exists and belongs to the user based on their role
   */
  private async validateProductOwnership(
    productId: string,
    user: { id: string; role: string; vendorId?: string },
  ): Promise<Product> {
    const query = this.buildRoleBasedQuery({ id: productId }, user);
    const product = await this.prisma.product.findFirst({ where: query });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findById(id: string): Promise<Product | null> {
    try {
      return await this.prisma.product.findUnique({
        where: { id: id },
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Validates input for image upload
   */
  private async validateUploadImagesInput(
    user: { id: string; role: string },
    productId: string,
    files: UploadedFile[],
  ): Promise<{ product: Product; normalizedFiles: UploadedFile[] }> {
    const { id } = user;

    // Validate product ownership
    const product = await this.validateProductOwnership(productId, user);

    // Normalize files parameter to always be an array
    const normalizedFiles = Array.isArray(files) ? files : files ? [files] : [];

    if (normalizedFiles.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Check current image count
    const currentImageCount = product.images?.length || 0;
    const maxImages = this.MAX_PRODUCT_IMAGES;

    if (currentImageCount >= maxImages) {
      throw new BadRequestException(
        `Product already has maximum ${maxImages} images`,
      );
    }

    const availableSlots = maxImages - currentImageCount;
    if (normalizedFiles.length > availableSlots) {
      throw new BadRequestException(
        `Cannot upload ${normalizedFiles.length} images. Only ${availableSlots} slots available (current: ${currentImageCount}, max: ${maxImages})`,
      );
    }

    return { product, normalizedFiles };
  }

  /**
   * Processes and validates uploaded files
   */
  private async processAndValidateFiles(
    files: UploadedFile[],
    userId: string,
    productId: string,
  ): Promise<Array<{ buffer: Buffer; filename: string }>> {
    const fileData: Array<{ buffer: Buffer; filename: string }> = [];

    for (const file of files) {
      try {
        // Validate file structure
        if (!file || typeof file !== 'object') {
          throw new BadRequestException('Invalid file format provided');
        }

        if (!file.filename || typeof file.filename !== 'string') {
          throw new BadRequestException('Invalid filename provided');
        }

        if (!file.buffer || !(file.buffer instanceof Buffer)) {
          throw new BadRequestException(
            `Invalid buffer for file ${file.filename}`,
          );
        }

        if (file.buffer.length === 0) {
          throw new BadRequestException(
            `Empty file provided: ${file.filename}`,
          );
        }

        // Validate image using ImageProcessingService
        const validation = await this.imageProcessingService.validateImage(
          file.buffer,
        );
        if (!validation.isValid) {
          throw new BadRequestException(
            `Invalid image file ${file.filename}: ${validation.error}`,
          );
        }

        fileData.push({
          buffer: file.buffer,
          filename: file.filename,
        });
      } catch (error) {
        throw error;
      }
    }

    return fileData;
  }

  /**
   * Uploads images to storage
   */
  private async uploadImagesToStorage(
    fileData: Array<{ buffer: Buffer; filename: string }>,
    productId: string,
  ): Promise<any[]> {
    return await this.imageProcessingService.processAndUploadMultipleImages(
      fileData,
      productId,
    );
  }

  /**
   * Updates product with new image URLs
   */
  private async updateProductImages(
    productId: string,
    existingImages: string[],
    newImageUrls: string[],
  ): Promise<string[]> {
    const updatedImages = [...existingImages, ...newImageUrls];
    await this.prisma.product.update({
      where: { id: productId },
      data: { images: updatedImages },
    });
    return updatedImages;
  }

  async uploadProductImages(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
    files: UploadedFile[],
  ): Promise<UploadProductImagesResponseDto> {
    const { id: userId } = user;

    try {
      // Validate input
      const { product, normalizedFiles } = await this.validateUploadImagesInput(
        user,
        productId,
        files,
      );

      // Process and validate files
      const fileData = await this.processAndValidateFiles(
        normalizedFiles,
        userId,
        productId,
      );

      // Upload images
      const uploadResults = await this.uploadImagesToStorage(
        fileData,
        productId,
      );

      // Update product
      const newImageUrls = uploadResults.map((result) => result.url);
      const updatedImages = await this.updateProductImages(
        productId,
        product.images || [],
        newImageUrls,
      );

      // Prepare response
      const uploadedImages: ProductImageResponseDto[] = uploadResults.map(
        (result, index) => ({
          id: result.key,
          url: result.url,
          filename: normalizedFiles[index].filename,
          size: fileData[index].buffer.length,
          width: 800, // Processed dimensions
          height: 600,
          uploadedAt: new Date(),
        }),
      );

      const response: UploadProductImagesResponseDto = {
        productId,
        uploadedCount: uploadResults.length,
        images: uploadedImages,
        totalImages: updatedImages.length,
        uploadedAt: new Date(),
      };
      return response;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to upload product images');
    }
  }

  async deleteProductImage(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
    imageId: string,
  ): Promise<{ message: string; remainingImages: number }> {
    const { id: userId } = user;

    try {
      // Validate product ownership
      const product = await this.validateProductOwnership(productId, user);

      const currentImages = product.images || [];
      const imageIndex = currentImages.findIndex((url) =>
        url.includes(imageId),
      );

      if (imageIndex === -1) {
        throw new NotFoundException('Image not found in product');
      }

      // Remove image from array
      const updatedImages = currentImages.filter(
        (_, index) => index !== imageIndex,
      );

      // Extract S3 key from the image URL for storage deletion
      const imageUrl = currentImages[imageIndex];
      let s3Key: string | null = null;

      try {
        s3Key = this.extractS3KeyFromUrl(imageUrl);
      } catch (error) {
        throw new BadRequestException('Invalid image URL format');
      }

      // Update the product record first to maintain data integrity
      await this.prisma.product.update({
        where: { id: productId },
        data: { images: updatedImages },
      });

      // Attempt to delete from storage after database update
      if (s3Key) {
        try {
          await this.s3Service.deleteFile(s3Key);
        } catch (storageError) {
          // Log storage deletion failure but don't fail the operation
          throw new BadRequestException('Failed to delete image from storage');
        }
      }

      return {
        message: 'Image deleted successfully',
        remainingImages: updatedImages.length,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete product image');
    }
  }

  /**
   * Validates input for image reordering
   */
  private validateReorderInput(product: Product, imageIds: string[]): void {
    const currentImages = product.images || [];

    if (imageIds.length !== currentImages.length) {
      throw new BadRequestException(
        `Image count mismatch. Provided ${imageIds.length} IDs but product has ${currentImages.length} images`,
      );
    }
  }

  /**
   * Reorders images based on provided IDs
   */
  private reorderImages(currentImages: string[], imageIds: string[]): string[] {
    const indices = new Set<number>();
    const reorderedImages: string[] = [];

    for (const id of imageIds) {
      if (!id.startsWith('image_')) {
        throw new BadRequestException(`Invalid image ID format: ${id}`);
      }

      const index = parseInt(id.split('_')[1], 10);
      if (isNaN(index) || index < 0 || index >= currentImages.length) {
        throw new BadRequestException(`Invalid image index in ID: ${id}`);
      }

      if (indices.has(index)) {
        throw new BadRequestException(`Duplicate image ID: ${id}`);
      }

      indices.add(index);
      reorderedImages.push(currentImages[index]);
    }

    if (indices.size !== currentImages.length) {
      throw new BadRequestException(
        'Not all images are included in the reorder list',
      );
    }

    return reorderedImages;
  }

  async reorderProductImages(
    user: { id: string; role: string; vendorId?: string },
    productId: string,
    imageIds: string[],
  ): Promise<{ message: string; images: ProductImageResponseDto[] }> {
    const { id: userId } = user;

    try {
      // Validate product ownership
      const product = await this.validateProductOwnership(productId, user);

      // Validate reorder input
      this.validateReorderInput(product, imageIds);

      // Reorder images
      const reorderedImages = this.reorderImages(
        product.images || [],
        imageIds,
      );

      // Update product
      await this.prisma.product.update({
        where: { id: productId },
        data: { images: reorderedImages },
      });

      // Prepare response
      const images: ProductImageResponseDto[] = reorderedImages.map(
        (url, index) => ({
          id: `image_${index}`,
          url,
          filename: `product-image-${index + 1}.webp`,
          size: 0,
          width: 800,
          height: 600,
          uploadedAt: new Date(),
        }),
      );

      // Log success
      return {
        message: 'Images reordered successfully',
        images,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      // Log error
      throw new BadRequestException('Failed to reorder product images');
    }
  }

  /**
   * Extract the S3 key from a Supabase Storage URL.
   *
   * This utility method parses Supabase Storage public URLs to extract the storage key.
   * The URL format is: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{key}
   *
   * @param url - The full Supabase Storage URL
   * @returns string - The extracted storage key (e.g., 'products/123/image.webp')
   * @throws Error - When URL format is invalid
   */
  private extractS3KeyFromUrl(url: string): string {
    try {
      const urlParts = url.split('/storage/v1/object/public/');
      if (urlParts.length !== 2) {
        throw new Error('Invalid Supabase Storage URL format');
      }

      const bucketAndKey = urlParts[1];
      const bucketEndIndex = bucketAndKey.indexOf('/');
      if (bucketEndIndex === -1) {
        throw new Error(
          'Invalid Supabase Storage URL format - missing bucket separator',
        );
      }

      // Extract everything after the bucket name
      return bucketAndKey.substring(bucketEndIndex + 1);
    } catch (error) {
      throw new Error(`Invalid image URL format: ${url}`);
    }
  }
}
