import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyDetectionService } from './anomaly-detection.service';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnomalyDetectionService],
    }).compile();
    service = module.get<AnomalyDetectionService>(AnomalyDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkPowerKw', () => {
    it('should return null for null/undefined', () => {
      expect(service.checkPowerKw(null)).toBeNull();
      expect(service.checkPowerKw(undefined)).toBeNull();
    });

    it('should set needsReview when out of range (30-800)', () => {
      expect(service.checkPowerKw(20)).toEqual({ inRange: false, needsReview: true, message: expect.any(String) });
      expect(service.checkPowerKw(900)).toEqual({ inRange: false, needsReview: true, message: expect.any(String) });
    });

    it('should not set needsReview when in range', () => {
      expect(service.checkPowerKw(81)).toEqual({ inRange: true, needsReview: false });
      expect(service.checkPowerKw(30)).toEqual({ inRange: true, needsReview: false });
      expect(service.checkPowerKw(800)).toEqual({ inRange: true, needsReview: false });
    });
  });

  describe('checkTopSpeedKmh', () => {
    it('should set needsReview when out of 80-350', () => {
      expect(service.checkTopSpeedKmh(50)).toMatchObject({ inRange: false, needsReview: true });
      expect(service.checkTopSpeedKmh(400)).toMatchObject({ inRange: false, needsReview: true });
    });

    it('should not set needsReview when in range', () => {
      expect(service.checkTopSpeedKmh(200)).toMatchObject({ inRange: true, needsReview: false });
    });
  });

  describe('checkZeroTo100S', () => {
    it('should set needsReview when out of 2-25', () => {
      expect(service.checkZeroTo100S(1)).toMatchObject({ inRange: false, needsReview: true });
      expect(service.checkZeroTo100S(30)).toMatchObject({ inRange: false, needsReview: true });
    });

    it('should not set needsReview when in range', () => {
      expect(service.checkZeroTo100S(9.2)).toMatchObject({ inRange: true, needsReview: false });
    });
  });
});
