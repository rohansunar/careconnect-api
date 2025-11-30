import { Test, TestingModule } from '@nestjs/testing';
import { VendorProductsService } from '../../src/vendor/services/vendor-products.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from '../../src/product/dto/create-product.dto';
import { UpdateProductDto } from '../../src/product/dto/update-product.dto';

describe('VendorProductsService', () => {
  let service: VendorProductsService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      vendorProduct: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VendorProductsService>(VendorProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should return products for vendor successfully', async () => {
      const vendorId = 'vendor-123';
      const mockProducts = [
        {
          id: 'vp-1',
          name: 'Product 1',
          description: 'Desc 1',
          price: 100,
          deposit: 10,
          image_url: 'url1',
          product_id: 'p-1',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPrismaService.vendorProduct.findMany.mockResolvedValue(mockProducts);

      const result = await service.getProducts(vendorId);

      expect(result).toEqual(mockProducts);
      expect(mockPrismaService.vendorProduct.findMany).toHaveBeenCalledWith({
        where: { vendor_id: vendorId },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          deposit: true,
          image_url: true,
          product_id: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      });
    });

    it('should return empty array when no products found', async () => {
      const vendorId = 'vendor-123';
      mockPrismaService.vendorProduct.findMany.mockResolvedValue([]);

      const result = await service.getProducts(vendorId);

      expect(result).toEqual([]);
    });
  });

  describe('createProduct', () => {
    it('should create vendor product successfully', async () => {
      const vendorId = 'vendor-123';
      const dto: CreateVendorProductDto = {
        product_id: 'p-1',
        price: 100,
        deposit: 10,
      };
      const mockProduct = {
        id: 'p-1',
        name: 'Product 1',
        description: 'Desc 1',
        image_url: 'url1',
      };
      const mockVendorProduct = {
        id: 'vp-1',
        name: 'Product 1',
        description: 'Desc 1',
        price: 100,
        deposit: 10,
        image_url: 'url1',
        product_id: 'p-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.vendorProduct.findFirst.mockResolvedValue(null);
      mockPrismaService.vendorProduct.create.mockResolvedValue(
        mockVendorProduct,
      );

      const result = await service.createProduct(vendorId, dto);

      expect(result).toEqual(mockVendorProduct);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: dto.product_id },
      });
      expect(mockPrismaService.vendorProduct.findFirst).toHaveBeenCalledWith({
        where: {
          vendor_id: vendorId,
          product_id: dto.product_id,
        },
      });
      expect(mockPrismaService.vendorProduct.create).toHaveBeenCalledWith({
        data: {
          vendor_id: vendorId,
          product_id: dto.product_id,
          name: mockProduct.name,
          description: mockProduct.description,
          price: dto.price,
          deposit: dto.deposit,
          image_url: mockProduct.image_url,
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          deposit: true,
          image_url: true,
          product_id: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      });
    });

    it('should throw BadRequestException when product not found', async () => {
      const vendorId = 'vendor-123';
      const dto: CreateVendorProductDto = {
        product_id: 'p-1',
        price: 100,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.createProduct(vendorId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: dto.product_id },
      });
      expect(mockPrismaService.vendorProduct.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.vendorProduct.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when vendor product already exists', async () => {
      const vendorId = 'vendor-123';
      const dto: CreateVendorProductDto = {
        product_id: 'p-1',
        price: 100,
      };
      const mockProduct = {
        id: 'p-1',
        name: 'Product 1',
        description: 'Desc 1',
        image_url: 'url1',
      };
      const existingVendorProduct = {
        id: 'vp-1',
        vendor_id: vendorId,
        product_id: 'p-1',
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.vendorProduct.findFirst.mockResolvedValue(
        existingVendorProduct,
      );

      await expect(service.createProduct(vendorId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.product.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.vendorProduct.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.vendorProduct.create).not.toHaveBeenCalled();
    });

    it('should create product without deposit when not provided', async () => {
      const vendorId = 'vendor-123';
      const dto: CreateVendorProductDto = {
        product_id: 'p-1',
        price: 100,
      };
      const mockProduct = {
        id: 'p-1',
        name: 'Product 1',
        description: 'Desc 1',
        image_url: 'url1',
      };
      const mockVendorProduct = {
        id: 'vp-1',
        name: 'Product 1',
        description: 'Desc 1',
        price: 100,
        deposit: null,
        image_url: 'url1',
        product_id: 'p-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.vendorProduct.findFirst.mockResolvedValue(null);
      mockPrismaService.vendorProduct.create.mockResolvedValue(
        mockVendorProduct,
      );

      const result = await service.createProduct(vendorId, dto);

      expect(result).toEqual(mockVendorProduct);
      expect(mockPrismaService.vendorProduct.create).toHaveBeenCalledWith({
        data: {
          vendor_id: vendorId,
          product_id: dto.product_id,
          name: mockProduct.name,
          description: mockProduct.description,
          price: dto.price,
          deposit: dto.deposit,
          image_url: mockProduct.image_url,
        },
        select: expect.any(Object),
      });
    });
  });

  describe('updateProduct', () => {
    it('should update vendor product successfully', async () => {
      const vendorId = 'vendor-123';
      const productId = 'vp-1';
      const dto: UpdateVendorProductDto = {
        price: 150,
        deposit: 15,
      };
      const mockVendorProduct = {
        id: productId,
        vendor_id: vendorId,
        product_id: 'p-1',
      };
      const updatedProduct = {
        id: productId,
        name: 'Product 1',
        description: 'Desc 1',
        price: 150,
        deposit: 15,
        image_url: 'url1',
        product_id: 'p-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.vendorProduct.findFirst.mockResolvedValue(
        mockVendorProduct,
      );
      mockPrismaService.vendorProduct.update.mockResolvedValue(updatedProduct);

      const result = await service.updateProduct(vendorId, productId, dto);

      expect(result).toEqual(updatedProduct);
      expect(mockPrismaService.vendorProduct.findFirst).toHaveBeenCalledWith({
        where: {
          id: productId,
          vendor_id: vendorId,
        },
      });
      expect(mockPrismaService.vendorProduct.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: dto,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          deposit: true,
          image_url: true,
          product_id: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      });
    });

    it('should throw NotFoundException when vendor product not found', async () => {
      const vendorId = 'vendor-123';
      const productId = 'vp-1';
      const dto: UpdateVendorProductDto = {
        price: 150,
      };

      mockPrismaService.vendorProduct.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProduct(vendorId, productId, dto),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.vendorProduct.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.vendorProduct.update).not.toHaveBeenCalled();
    });

    it('should update only provided fields', async () => {
      const vendorId = 'vendor-123';
      const productId = 'vp-1';
      const dto: UpdateVendorProductDto = {
        price: 150,
      };
      const mockVendorProduct = {
        id: productId,
        vendor_id: vendorId,
        product_id: 'p-1',
      };
      const updatedProduct = {
        id: productId,
        name: 'Product 1',
        description: 'Desc 1',
        price: 150,
        deposit: 10,
        image_url: 'url1',
        product_id: 'p-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.vendorProduct.findFirst.mockResolvedValue(
        mockVendorProduct,
      );
      mockPrismaService.vendorProduct.update.mockResolvedValue(updatedProduct);

      const result = await service.updateProduct(vendorId, productId, dto);

      expect(result).toEqual(updatedProduct);
      expect(mockPrismaService.vendorProduct.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: dto,
        select: expect.any(Object),
      });
    });
  });

  describe('deleteProduct', () => {
    it('should deactivate vendor product successfully', async () => {
      const vendorId = 'vendor-123';
      const productId = 'vp-1';
      const mockVendorProduct = {
        id: productId,
        vendor_id: vendorId,
        product_id: 'p-1',
        is_active: true,
      };

      mockPrismaService.vendorProduct.findFirst.mockResolvedValue(
        mockVendorProduct,
      );
      mockPrismaService.vendorProduct.update.mockResolvedValue({});

      const result = await service.deleteProduct(vendorId, productId);

      expect(result).toEqual({ message: 'Vendor product deactivated' });
      expect(mockPrismaService.vendorProduct.findFirst).toHaveBeenCalledWith({
        where: {
          id: productId,
          vendor_id: vendorId,
        },
      });
      expect(mockPrismaService.vendorProduct.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { is_active: false },
      });
    });

    it('should throw NotFoundException when vendor product not found', async () => {
      const vendorId = 'vendor-123';
      const productId = 'vp-1';

      mockPrismaService.vendorProduct.findFirst.mockResolvedValue(null);

      await expect(service.deleteProduct(vendorId, productId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.vendorProduct.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.vendorProduct.update).not.toHaveBeenCalled();
    });
  });
});
