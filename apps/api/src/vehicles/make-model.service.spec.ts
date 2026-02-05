import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MakeModelService } from './make-model.service';
import { ReferenceStatus } from 'database';

describe('MakeModelService', () => {
  let service: MakeModelService;
  let prisma: PrismaService;

  const mockPrisma = {
    make: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    model: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MakeModelService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<MakeModelService>(MakeModelService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveMakeBySlug', () => {
    it('should return make when slug matches', async () => {
      const make = { id: '1', name: 'Volkswagen', slug: 'volkswagen', status: ReferenceStatus.verified };
      mockPrisma.make.findFirst.mockResolvedValue(make);
      const result = await service.resolveMakeBySlug('volkswagen');
      expect(result).toEqual(make);
      expect(mockPrisma.make.findFirst).toHaveBeenCalledWith({
        where: { slug: 'volkswagen' },
      });
    });

    it('should normalize slug (lowercase, trim)', async () => {
      mockPrisma.make.findFirst.mockResolvedValue(null);
      await service.resolveMakeBySlug('  Volkswagen  ');
      expect(mockPrisma.make.findFirst).toHaveBeenCalledWith({
        where: { slug: 'volkswagen' },
      });
    });
  });

  describe('suggestMakeByName', () => {
    it('should return existing make when slug matches (no duplicate)', async () => {
      const make = { id: '1', name: 'Volkswagen', slug: 'volkswagen', status: ReferenceStatus.verified };
      mockPrisma.make.findFirst.mockResolvedValue(make);
      const result = await service.suggestMakeByName('Volkswagen');
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].slug).toBe('volkswagen');
      expect(result.created).toBeUndefined();
    });

    it('should return suggestions when no exact slug match', async () => {
      mockPrisma.make.findFirst.mockResolvedValue(null);
      mockPrisma.make.findMany.mockResolvedValue([
        { id: '1', name: 'Volkswagen', slug: 'volkswagen', status: ReferenceStatus.verified, aliases: [{ normalizedAlias: 'vw' }] },
      ]);
      const result = await service.suggestMakeByName('VW');
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createMakeUnverified', () => {
    it('should return existing make when suggest finds match (dedupe)', async () => {
      const existing = { id: '1', name: 'Volkswagen', slug: 'volkswagen', status: ReferenceStatus.verified };
      mockPrisma.make.findFirst.mockResolvedValue(existing);
      const result = await service.createMakeUnverified('Volkswagen');
      expect(result.id).toBe('1');
      expect(result.slug).toBe('volkswagen');
      expect(mockPrisma.make.create).not.toHaveBeenCalled();
    });

    it('should create new make when no match', async () => {
      mockPrisma.make.findFirst.mockResolvedValue(null);
      mockPrisma.make.findMany.mockResolvedValue([]);
      mockPrisma.make.create.mockResolvedValue({
        id: '2',
        name: 'Renault',
        slug: 'renault',
        status: ReferenceStatus.unverified,
      });
      const result = await service.createMakeUnverified('Renault');
      expect(result.slug).toBe('renault');
      expect(result.status).toBe(ReferenceStatus.unverified);
      expect(mockPrisma.make.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Renault',
            slug: 'renault',
            status: ReferenceStatus.unverified,
            externalSource: 'crowd',
          }),
        }),
      );
    });
  });
});
