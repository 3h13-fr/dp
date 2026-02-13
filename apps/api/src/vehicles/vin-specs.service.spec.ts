import { Test, TestingModule } from '@nestjs/testing';
import { VinSpecsService } from './vin-specs.service';
import { VinValidationService } from './vin-validation.service';
import { MakeModelService } from './make-model.service';
import { NhtsaSpecProvider } from './nhtsa-spec-provider.service';

describe('VinSpecsService', () => {
  let service: VinSpecsService;
  let vinValidation: jest.Mocked<VinValidationService>;
  let makeModel: jest.Mocked<MakeModelService>;
  let nhtsaProvider: jest.Mocked<NhtsaSpecProvider>;

  beforeEach(async () => {
    const mockVinValidation = {
      validateFormat: jest.fn(),
    };

    const mockMakeModel = {
      suggestMakeByName: jest.fn(),
      suggestModelByName: jest.fn(),
      createMakeUnverified: jest.fn(),
      createModelUnverified: jest.fn(),
    };

    const mockNhtsaProvider = {
      getSpecsByVin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VinSpecsService,
        { provide: VinValidationService, useValue: mockVinValidation },
        { provide: MakeModelService, useValue: mockMakeModel },
        { provide: NhtsaSpecProvider, useValue: mockNhtsaProvider },
      ],
    }).compile();

    service = module.get<VinSpecsService>(VinSpecsService);
    vinValidation = module.get(VinValidationService);
    makeModel = module.get(MakeModelService);
    nhtsaProvider = module.get(NhtsaSpecProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchSpecsByVin', () => {
    it('should return null for invalid VIN format', async () => {
      vinValidation.validateFormat.mockReturnValue({ valid: false, error: 'Invalid format' });

      const result = await service.fetchSpecsByVin('INVALID');
      expect(result).toBeNull();
      expect(nhtsaProvider.getSpecsByVin).not.toHaveBeenCalled();
    });

    it('should return null if provider returns no specs', async () => {
      vinValidation.validateFormat.mockReturnValue({ valid: true, wmi: 'WVW' });
      nhtsaProvider.getSpecsByVin.mockResolvedValue(null);

      const result = await service.fetchSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).toBeNull();
    });

    it('should return null if provider returns incomplete specs', async () => {
      vinValidation.validateFormat.mockReturnValue({ valid: true, wmi: 'WVW' });
      nhtsaProvider.getSpecsByVin.mockResolvedValue({
        makeName: 'VOLKSWAGEN',
        // Missing modelName and modelYear
      });

      const result = await service.fetchSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).toBeNull();
    });

    it('should resolve existing make and model', async () => {
      vinValidation.validateFormat.mockReturnValue({ valid: true, wmi: 'WVW' });
      nhtsaProvider.getSpecsByVin.mockResolvedValue({
        makeName: 'VOLKSWAGEN',
        modelName: 'GOLF',
        modelYear: 2020,
        fuelType: 'petrol',
        confidence: 0.85,
      });
      makeModel.suggestMakeByName.mockResolvedValue({
        suggestions: [{ id: 'make-1', name: 'VOLKSWAGEN', slug: 'volkswagen', status: 'verified' }],
      });
      makeModel.suggestModelByName.mockResolvedValue({
        suggestions: [{ id: 'model-1', name: 'GOLF', slug: 'golf', status: 'verified', makeId: 'make-1' }],
      });

      const result = await service.fetchSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).not.toBeNull();
      expect(result?.makeId).toBe('make-1');
      expect(result?.modelId).toBe('model-1');
      expect(result?.modelYear).toBe(2020);
      expect(result?.makeName).toBe('VOLKSWAGEN');
      expect(result?.modelName).toBe('GOLF');
      expect(result?.fuelType).toBe('petrol');
      expect(result?.source).toBe('nhtsa');
    });

    it('should create unverified make and model if not found', async () => {
      vinValidation.validateFormat.mockReturnValue({ valid: true, wmi: 'WVW' });
      nhtsaProvider.getSpecsByVin.mockResolvedValue({
        makeName: 'UNKNOWNMAKE',
        modelName: 'UNKNOWNMODEL',
        modelYear: 2020,
        confidence: 0.85,
      });
      makeModel.suggestMakeByName.mockResolvedValue({ suggestions: [] });
      makeModel.suggestModelByName.mockResolvedValue({ suggestions: [] });
      makeModel.createMakeUnverified.mockResolvedValue({
        id: 'make-new',
        name: 'UNKNOWNMAKE',
        slug: 'unknownmake',
        status: 'unverified',
      });
      makeModel.createModelUnverified.mockResolvedValue({
        id: 'model-new',
        name: 'UNKNOWNMODEL',
        slug: 'unknownmodel',
        status: 'unverified',
        makeId: 'make-new',
      });

      const result = await service.fetchSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).not.toBeNull();
      expect(result?.makeId).toBe('make-new');
      expect(result?.modelId).toBe('model-new');
      expect(makeModel.createMakeUnverified).toHaveBeenCalledWith('UNKNOWNMAKE');
      expect(makeModel.createModelUnverified).toHaveBeenCalledWith('make-new', 'UNKNOWNMODEL');
    });

    it('should return null if make resolution fails', async () => {
      vinValidation.validateFormat.mockReturnValue({ valid: true, wmi: 'WVW' });
      nhtsaProvider.getSpecsByVin.mockResolvedValue({
        makeName: 'VOLKSWAGEN',
        modelName: 'GOLF',
        modelYear: 2020,
      });
      makeModel.suggestMakeByName.mockRejectedValue(new Error('Database error'));

      const result = await service.fetchSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).toBeNull();
    });

    it('should return null if model resolution fails', async () => {
      vinValidation.validateFormat.mockReturnValue({ valid: true, wmi: 'WVW' });
      nhtsaProvider.getSpecsByVin.mockResolvedValue({
        makeName: 'VOLKSWAGEN',
        modelName: 'GOLF',
        modelYear: 2020,
      });
      makeModel.suggestMakeByName.mockResolvedValue({
        suggestions: [{ id: 'make-1', name: 'VOLKSWAGEN', slug: 'volkswagen', status: 'verified' }],
      });
      makeModel.suggestModelByName.mockRejectedValue(new Error('Database error'));

      const result = await service.fetchSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).toBeNull();
    });

    it('should handle provider errors gracefully', async () => {
      vinValidation.validateFormat.mockReturnValue({ valid: true, wmi: 'WVW' });
      nhtsaProvider.getSpecsByVin.mockRejectedValue(new Error('Network error'));

      const result = await service.fetchSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).toBeNull();
    });
  });
});
