import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { QueueService } from '../queue/queue.service';
import { ConfigService } from '@nestjs/config';

const SALT_ROUNDS = 10;

describe('AuthService', () => {
  let service: AuthService;
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = { sign: jest.fn() };
  const mockQueueService = {};
  const mockConfigService = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('changePassword', () => {
    const userId = 'user-1';
    const currentPassword = 'currentSecret123';
    const newPassword = 'newSecret456';

    it('should update password when current password is correct', async () => {
      const passwordHash = await bcrypt.hash(currentPassword, SALT_ROUNDS);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
        passwordHash,
      });
      mockPrisma.user.update.mockResolvedValue({ id: userId });

      const result = await service.changePassword({
        userId,
        currentPassword,
        newPassword,
      });

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { id: true, email: true, passwordHash: true },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          passwordHash: expect.any(String),
        }),
      });
      const newHash = mockPrisma.user.update.mock.calls[0][0].data.passwordHash;
      const matchesNew = await bcrypt.compare(newPassword, newHash);
      expect(matchesNew).toBe(true);
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      const passwordHash = await bcrypt.hash(currentPassword, SALT_ROUNDS);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
        passwordHash,
      });

      await expect(
        service.changePassword({
          userId,
          currentPassword: 'wrongPassword',
          newPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user has no passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
        passwordHash: null,
      });

      await expect(
        service.changePassword({
          userId,
          currentPassword,
          newPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword({
          userId,
          currentPassword,
          newPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });
});
