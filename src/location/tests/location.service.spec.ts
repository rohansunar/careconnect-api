import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from '../services/location.service';
import { PrismaService } from '../../common/database/prisma.service';

describe('LocationService', () => {
  let service: LocationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: PrismaService,
          useValue: {
            location: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            customerAddress: {
              count: jest.fn(),
            },
            vendorAddress: {
              count: jest.fn(),
            },
            $queryRaw: jest.fn(),
            $queryRawUnsafe: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get<LocationService>(LocationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
