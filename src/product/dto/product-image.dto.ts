import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UploadProductImagesDto {
  @ApiProperty({
    description: 'Product images to upload',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    maxItems: 10,
  })
  images: any[];
}

export class ProductImageResponseDto {
  @ApiProperty({
    description: 'Image unique identifier',
    example: 'products/123/1703123456789_image.jpg',
  })
  id: string;

  @ApiProperty({
    description: 'Image URL',
    example:
      'https://water-delivery-images.s3.amazonaws.com/products/123/1703123456789_image.webp',
  })
  url: string;

  @ApiProperty({
    description: 'Image filename',
    example: 'product-image-1.webp',
  })
  filename: string;

  @ApiProperty({
    description: 'Image size in bytes',
    example: 245760,
  })
  size: number;

  @ApiProperty({
    description: 'Image width in pixels',
    example: 800,
  })
  width: number;

  @ApiProperty({
    description: 'Image height in pixels',
    example: 600,
  })
  height: number;

  @ApiProperty({
    description: 'Image upload timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  uploadedAt: Date;
}

export class UploadProductImagesResponseDto {
  @ApiProperty({
    description: 'Product unique identifier',
    example: '123',
  })
  productId: string;

  @ApiProperty({
    description: 'Total number of images uploaded',
    example: 3,
  })
  uploadedCount: number;

  @ApiProperty({
    description: 'List of uploaded images',
    type: [ProductImageResponseDto],
  })
  images: ProductImageResponseDto[];

  @ApiProperty({
    description: 'Total number of images for this product after upload',
    example: 5,
  })
  totalImages: number;

  @ApiProperty({
    description: 'Upload completion timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  uploadedAt: Date;
}

export class DeleteProductImageDto {
  @ApiProperty({
    description: 'Image ID to delete',
    example: 'products/123/1703123456789_image.webp',
  })
  @IsString()
  @IsNotEmpty()
  imageId: string;
}

export class ReorderProductImagesDto {
  @ApiProperty({
    description: 'Ordered list of image IDs',
    example: [
      'products/123/1703123456789_image1.webp',
      'products/123/1703123456789_image2.webp',
      'products/123/1703123456789_image3.webp',
    ],
    type: [String],
    maxItems: 10,
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(250, { each: true })
  imageIds: string[];
}
