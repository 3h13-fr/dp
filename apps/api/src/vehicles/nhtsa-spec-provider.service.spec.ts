import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NhtsaSpecProvider } from './nhtsa-spec-provider.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('NhtsaSpecProvider', () => {
  let provider: NhtsaSpecProvider;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [NhtsaSpecProvider],
    }).compile();
    provider = module.get<NhtsaSpecProvider>(NhtsaSpecProvider);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('getSpecsByVin', () => {
    it('should return null if provider is disabled', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('false');
      const newProvider = new NhtsaSpecProvider(configService);
      const result = await newProvider.getSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).toBeNull();
    });

    it('should return null for invalid VIN format', async () => {
      expect(await provider.getSpecsByVin('')).toBeNull();
      expect(await provider.getSpecsByVin('ABC123')).toBeNull();
      expect(await provider.getSpecsByVin('A'.repeat(16))).toBeNull();
    });

    it('should return null if API returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await provider.getSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).toBeNull();
    });

    it('should return null if API returns no results', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Results: [],
        }),
      });

      const result = await provider.getSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).toBeNull();
    });

    it('should return null if VIN has error code', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Results: [
            { Variable: 'ErrorCode', Value: '1', VariableId: 1 },
            { Variable: 'ErrorText', Value: 'Invalid VIN', VariableId: 2 },
          ],
        }),
      });

      const result = await provider.getSpecsByVin('INVALIDVIN1234567');
      expect(result).toBeNull();
    });

    it('should parse and map NHTSA response correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Results: [
            { Variable: 'Make', Value: 'VOLKSWAGEN', VariableId: 1 },
            { Variable: 'Model', Value: 'GOLF', VariableId: 2 },
            { Variable: 'ModelYear', Value: '2020', VariableId: 3 },
            { Variable: 'Trim', Value: 'GTI', VariableId: 4 },
            { Variable: 'Fuel Type - Primary', Value: 'Gasoline', VariableId: 5 },
            { Variable: 'TransmissionStyle', Value: 'Manual', VariableId: 6 },
            { Variable: 'DriveType', Value: 'FWD', VariableId: 7 },
            { Variable: 'ErrorCode', Value: '0', VariableId: 8 },
          ],
        }),
      });

      const result = await provider.getSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).not.toBeNull();
      expect(result?.makeName).toBe('VOLKSWAGEN');
      expect(result?.modelName).toBe('GOLF');
      expect(result?.modelYear).toBe(2020);
      expect(result?.trimLabel).toBe('GTI');
      expect(result?.fuelType).toBe('petrol');
      expect(result?.transmissionType).toBe('manual');
      expect(result?.driveType).toBe('fwd');
      expect(result?.confidence).toBe(0.85);
    });

    it('should return null if required fields are missing', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Results: [
            { Variable: 'Make', Value: 'VOLKSWAGEN', VariableId: 1 },
            // Missing Model and ModelYear
          ],
        }),
      });

      const result = await provider.getSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).toBeNull();
    });

    it('should handle timeout errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('TimeoutError'));

      const result = await provider.getSpecsByVin('WVWZZZ3CZWE123456');
      expect(result).toBeNull();
    });

    it('should map fuel types correctly', async () => {
      const testCases = [
        { input: 'Gasoline', expected: 'petrol' },
        { input: 'Diesel', expected: 'diesel' },
        { input: 'Electric', expected: 'electric' },
        { input: 'Hybrid', expected: 'hybrid' },
        { input: 'LPG', expected: 'lpg' },
        { input: 'Unknown', expected: 'other' },
      ];

      for (const testCase of testCases) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Results: [
              { Variable: 'Make', Value: 'TEST', VariableId: 1 },
              { Variable: 'Model', Value: 'TEST', VariableId: 2 },
              { Variable: 'ModelYear', Value: '2020', VariableId: 3 },
              { Variable: 'Fuel Type - Primary', Value: testCase.input, VariableId: 4 },
            ],
          }),
        });

        const result = await provider.getSpecsByVin('WVWZZZ3CZWE123456');
        expect(result?.fuelType).toBe(testCase.expected);
      }
    });

    it('should map transmission types correctly', async () => {
      const testCases = [
        { input: 'Manual', expected: 'manual' },
        { input: 'Automatic', expected: 'automatic' },
        { input: 'Semi-Automatic', expected: 'semi_automatic' },
        { input: 'CVT', expected: 'cvt' },
        { input: 'Unknown', expected: 'other' },
      ];

      for (const testCase of testCases) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Results: [
              { Variable: 'Make', Value: 'TEST', VariableId: 1 },
              { Variable: 'Model', Value: 'TEST', VariableId: 2 },
              { Variable: 'ModelYear', Value: '2020', VariableId: 3 },
              { Variable: 'TransmissionStyle', Value: testCase.input, VariableId: 4 },
            ],
          }),
        });

        const result = await provider.getSpecsByVin('WVWZZZ3CZWE123456');
        expect(result?.transmissionType).toBe(testCase.expected);
      }
    });

    it('should map drive types correctly', async () => {
      const testCases = [
        { input: 'FWD', expected: 'fwd' },
        { input: 'RWD', expected: 'rwd' },
        { input: 'AWD', expected: 'awd' },
        { input: '4WD', expected: 'awd' },
        { input: 'Unknown', expected: 'other' },
      ];

      for (const testCase of testCases) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            Results: [
              { Variable: 'Make', Value: 'TEST', VariableId: 1 },
              { Variable: 'Model', Value: 'TEST', VariableId: 2 },
              { Variable: 'ModelYear', Value: '2020', VariableId: 3 },
              { Variable: 'DriveType', Value: testCase.input, VariableId: 4 },
            ],
          }),
        });

        const result = await provider.getSpecsByVin('WVWZZZ3CZWE123456');
        expect(result?.driveType).toBe(testCase.expected);
      }
    });
  });
});
