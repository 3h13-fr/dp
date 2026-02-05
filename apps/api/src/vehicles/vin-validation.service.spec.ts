import { Test, TestingModule } from '@nestjs/testing';
import { VinValidationService } from './vin-validation.service';

describe('VinValidationService', () => {
  let service: VinValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VinValidationService],
    }).compile();
    service = module.get<VinValidationService>(VinValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFormat', () => {
    it('should reject empty or missing VIN', () => {
      expect(service.validateFormat('').valid).toBe(false);
      expect(service.validateFormat('   ').valid).toBe(false);
    });

    it('should reject VIN with wrong length', () => {
      expect(service.validateFormat('ABC123').valid).toBe(false);
      expect(service.validateFormat('A'.repeat(16)).valid).toBe(false);
      expect(service.validateFormat('A'.repeat(18)).valid).toBe(false);
    });

    it('should reject VIN containing I, O or Q', () => {
      expect(service.validateFormat('I' + 'A'.repeat(16)).valid).toBe(false);
      expect(service.validateFormat('O' + 'A'.repeat(16)).valid).toBe(false);
      expect(service.validateFormat('Q' + 'A'.repeat(16)).valid).toBe(false);
      expect(service.validateFormat('A'.repeat(8) + 'I' + 'A'.repeat(8)).valid).toBe(false);
    });

    it('should accept valid 17-char VIN without I/O/Q', () => {
      const result = service.validateFormat('WVWZZZ3CZWE123456');
      expect(result.valid).toBe(true);
      expect(result.wmi).toBe('WVW');
      expect(result.error).toBeUndefined();
    });

    it('should accept lowercase and trim input', () => {
      const result = service.validateFormat('  wvwzzz3czwe123456  ');
      expect(result.valid).toBe(true);
      expect(result.wmi).toBe('WVW');
    });

    it('should reject invalid characters', () => {
      expect(service.validateFormat('WVWZZZ3CZWE12345@').valid).toBe(false);
      expect(service.validateFormat('WVW ZZZ3CZWE123456').valid).toBe(false);
    });
  });
});
