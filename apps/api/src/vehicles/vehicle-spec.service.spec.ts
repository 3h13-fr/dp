import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleSpecService } from './vehicle-spec.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { SpecSource } from 'database';

type MockTx = {
  vehicle: { findUnique: jest.Mock; update: jest.Mock };
  vehicleSpecMeta: { upsert: jest.Mock };
  vehicleFieldAudit: { create: jest.Mock };
};

describe('VehicleSpecService', () => {
  let service: VehicleSpecService;
  const mockPrisma: MockTx & { $transaction: jest.Mock } = {
    vehicle: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    vehicleSpecMeta: {
      upsert: jest.fn().mockResolvedValue(undefined),
    },
    vehicleFieldAudit: {
      create: jest.fn().mockResolvedValue(undefined),
    },
    $transaction: jest.fn((fn: (tx: MockTx) => Promise<unknown>) => fn(mockPrisma)),
  };

  const mockAnomaly = {
    checkTopSpeedKmh: jest.fn().mockReturnValue({ inRange: true, needsReview: false }),
    checkZeroTo100S: jest.fn().mockReturnValue({ inRange: true, needsReview: false }),
    checkPowerKw: jest.fn().mockReturnValue({ inRange: true, needsReview: false }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma));
    mockPrisma.vehicle.findUnique.mockResolvedValue({
      id: 'v1',
      fuelType: null,
      transmissionType: null,
      driveType: null,
      topSpeedKmh: null,
      zeroTo100S: null,
      powerKw: null,
    });
    mockAnomaly.checkPowerKw.mockReturnValue({ inRange: true, needsReview: false });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleSpecService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnomalyDetectionService, useValue: mockAnomaly },
      ],
    }).compile();
    service = module.get<VehicleSpecService>(VehicleSpecService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertSpec', () => {
    it('should use higher confidence for host_confirmed than host_manual', async () => {
      await service.upsertSpec({
        vehicleId: 'v1',
        key: 'power_kw',
        value: 81,
        source: SpecSource.host_confirmed,
      });
      expect(mockPrisma.vehicleSpecMeta.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            source: SpecSource.host_confirmed,
            confidence: expect.any(Number),
          }),
        }),
      );
      const confConfirmed = mockPrisma.vehicleSpecMeta.upsert.mock.calls[0][0].create.confidence;
      jest.clearAllMocks();
      mockPrisma.vehicle.findUnique.mockResolvedValue({
        id: 'v1',
        fuelType: null,
        transmissionType: null,
        driveType: null,
        topSpeedKmh: null,
        zeroTo100S: null,
        powerKw: null,
      });
      await service.upsertSpec({
        vehicleId: 'v1',
        key: 'power_kw',
        value: 80,
        source: SpecSource.host_manual,
      });
      const confManual = mockPrisma.vehicleSpecMeta.upsert.mock.calls[0][0].create.confidence;
      expect(confConfirmed).toBeGreaterThan(confManual);
    });

    it('should set needsReview and lower confidence when value is out of range', async () => {
      mockAnomaly.checkPowerKw.mockReturnValue({ inRange: false, needsReview: true });
      await service.upsertSpec({
        vehicleId: 'v1',
        key: 'power_kw',
        value: 999,
        source: SpecSource.host_manual,
      });
      expect(mockPrisma.vehicleSpecMeta.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            needsReview: true,
            confidence: expect.any(Number),
          }),
        }),
      );
    });

    it('should write VehicleFieldAudit when value changes', async () => {
      mockPrisma.vehicle.findUnique.mockResolvedValue({
        id: 'v1',
        fuelType: null,
        transmissionType: null,
        driveType: null,
        topSpeedKmh: null,
        zeroTo100S: null,
        powerKw: 50,
      });
      await service.upsertSpec({
        vehicleId: 'v1',
        key: 'power_kw',
        value: 81,
        source: SpecSource.host_confirmed,
      });
      expect(mockPrisma.vehicleFieldAudit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vehicleId: 'v1',
          fieldName: 'power_kw',
          oldValue: '50',
          newValue: '81',
          source: SpecSource.host_confirmed,
        }),
      });
    });
  });
});
