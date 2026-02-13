import { HttpException, HttpStatus, Injectable, Logger, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Prisma } from 'database';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { Role } from 'database';

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 10;
const OTP_RATE_LIMIT_SECONDS = 60;
const OTP_LENGTH = 6;
const PASSWORD_RESET_EXPIRY_MINUTES = 60;
const PASSWORD_RESET_RATE_LIMIT_MINUTES = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;

export type JwtPayload = { sub: string; email: string; role: Role };

/** In-memory login attempt count per email (reset after window). */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(email: string): void {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry && now < entry.resetAt && entry.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    throw new HttpException(
      'Too many login attempts. Please try again later.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

function recordFailedLoginAttempt(email: string): void {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry) {
    if (now >= entry.resetAt) {
      loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS });
    } else {
      entry.count += 1;
    }
  } else {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS });
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private queue: QueueService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user?.passwordHash) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(email: string, password: string) {
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail) throw new BadRequestException('Email required');
    checkLoginRateLimit(normalizedEmail);
    const user = await this.validateUser(normalizedEmail, password);
    if (!user) {
      recordFailedLoginAttempt(normalizedEmail);
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.signToken(user.id, user.email, user.role);
  }

  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      email: data.email,
      passwordHash,
      role: Role.CLIENT,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    return this.signToken(user.id, user.email, user.role);
  }

  signToken(sub: string, email: string, role: Role) {
    const payload: JwtPayload = { sub, email, role };
    return {
      access_token: this.jwtService.sign(payload),
      expires_in: '7d',
      role,
    };
  }

  async validateJwtPayload(payload: JwtPayload) {
    return this.usersService.findOne(payload.sub);
  }

  /** Generate 6-digit OTP. */
  private generateOtp(): string {
    return String(Math.floor(100_000 + Math.random() * 900_000));
  }

  /** Send OTP to email (or phone later). Rate-limited per email. */
  async sendCode(params: { email?: string; phone?: string; locale?: string }) {
    const { email, phone, locale = 'en' } = params;
    if (!email && !phone) throw new BadRequestException('Email or phone required');
    if (email && phone) throw new BadRequestException('Provide either email or phone, not both');

    const normalizedEmail = email?.toLowerCase().trim();
    const key = normalizedEmail ?? phone!;

    // Rate limit: no send in the last OTP_RATE_LIMIT_SECONDS
    const since = new Date(Date.now() - OTP_RATE_LIMIT_SECONDS * 1000);
    const recent = await this.prisma.otpRequest.findFirst({
      where: normalizedEmail ? { email: normalizedEmail } : { phone },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && recent.createdAt > since) {
      const wait = Math.ceil((recent.createdAt.getTime() - since.getTime()) / 1000);
      throw new HttpException(
        `Please wait ${wait} seconds before requesting another code`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otpRequest.create({
      data: {
        email: normalizedEmail ?? undefined,
        phone: phone ?? undefined,
        code,
        expiresAt,
      },
    });

    if (normalizedEmail) {
      await this.queue.enqueueOtpEmail(normalizedEmail, code, locale);
      // En dev (SMTP local ou non configuré), afficher le code dans la console pour pouvoir se connecter
      this.logger.log(`[OTP] Code for ${normalizedEmail}: ${code} (valid ${OTP_EXPIRY_MINUTES} min)`);
    }
    // TODO: SMS when phone is provided (Twilio, etc.)

    return { ok: true };
  }

  /** Verify OTP and return JWT. Creates user if new. */
  async verifyCode(params: { email?: string; phone?: string; code: string }) {
    const { email, phone, code } = params;
    if (!email && !phone) throw new BadRequestException('Email or phone required');
    if (!code || code.length !== OTP_LENGTH) throw new BadRequestException('Invalid code');

    const normalizedEmail = email?.toLowerCase().trim();
    const otp = await this.prisma.otpRequest.findFirst({
      where: {
        ...(normalizedEmail ? { email: normalizedEmail } : { phone: phone! }),
        code,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new UnauthorizedException('Invalid or expired code');

    await this.prisma.otpRequest.deleteMany({
      where: { id: otp.id },
    });

    const identifier = normalizedEmail ?? phone!;
    let user = normalizedEmail
      ? await this.usersService.findByEmail(normalizedEmail)
      : null; // TODO: findByPhone when phone auth is implemented

    if (!user && normalizedEmail) {
      user = await this.usersService.create({
        email: normalizedEmail,
        role: Role.CLIENT,
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    if (!user) throw new UnauthorizedException('Invalid or expired code');

    return this.signToken(user.id, user.email, user.role);
  }

  /** Request password reset: send email with link. Rate-limited per email. */
  async forgotPassword(params: { email: string; locale?: string }) {
    const { email, locale = 'en' } = params;
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail) throw new BadRequestException('Email required');

    // Rate limit: 1 request per PASSWORD_RESET_RATE_LIMIT_MINUTES per email
    const since = new Date(Date.now() - PASSWORD_RESET_RATE_LIMIT_MINUTES * 60 * 1000);
    const recent = await this.prisma.passwordResetToken.findFirst({
      where: { email: normalizedEmail },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && recent.createdAt > since) {
      throw new HttpException(
        'Please wait before requesting another reset link',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user?.passwordHash) {
      // Don't reveal whether email exists; return same success response
      return { ok: true };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
    await this.prisma.passwordResetToken.create({
      data: { email: normalizedEmail, token, expiresAt },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const localeSegment = locale === 'fr' ? 'fr' : 'en';
    const resetLink = `${frontendUrl}/${localeSegment}/reset-password?token=${token}`;
    await this.queue.enqueuePasswordResetEmail(normalizedEmail, resetLink, locale);
    this.logger.log(`[Password reset] Link sent to ${normalizedEmail} (valid ${PASSWORD_RESET_EXPIRY_MINUTES} min)`);

    return { ok: true };
  }

  /** Reset password with token from email. */
  async resetPassword(params: { token: string; newPassword: string }) {
    const { token, newPassword } = params;
    if (!token || newPassword.length < 8) throw new BadRequestException('Invalid token or password (min 8 characters)');

    const record = await this.prisma.passwordResetToken.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
    });
    if (!record) throw new UnauthorizedException('Invalid or expired reset link');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { email: record.email },
      data: { passwordHash },
    });
    await this.prisma.passwordResetToken.deleteMany({ where: { id: record.id } });

    this.logger.log(`[Password reset] Password updated for ${record.email}`);
    return { ok: true };
  }

  /** Change password for authenticated user (current + new). */
  async changePassword(params: { userId: string; currentPassword: string; newPassword: string }) {
    const { userId, currentPassword, newPassword } = params;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid or missing password');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    this.logger.log(`[Change password] Password updated for user ${user.id}`);
    return { ok: true };
  }

  /** Update user profile information. */
  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      profileData?: {
        preferredName?: string;
        hostDisplayName?: string;
        residentialAddress?: string;
        postalAddress?: string;
        emergencyContacts?: string;
      };
    },
  ) {
    try {
      const updateData: Prisma.UserUpdateInput = {};
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.profileData !== undefined) {
        // Check if profileData is an empty object (means clear all fields)
        const isEmptyObject = Object.keys(data.profileData).length === 0;
        
        if (isEmptyObject) {
          // Clear profileData by setting it to null
          updateData.profileData = Prisma.JsonNull;
        } else {
          // Merge with existing profileData if it exists
          const existing = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { profileData: true },
          });
          const existingProfileData = (existing?.profileData as Record<string, unknown>) || {};
          const mergedProfileData: Record<string, unknown> = { ...existingProfileData, ...data.profileData };
          // Remove undefined and null values to avoid storing them
          Object.keys(mergedProfileData).forEach(key => {
            if (mergedProfileData[key] === undefined || mergedProfileData[key] === null) {
              delete mergedProfileData[key];
            }
          });
          // Only update profileData if there are actual values, otherwise set to null to clear it
          if (Object.keys(mergedProfileData).length > 0) {
            updateData.profileData = mergedProfileData as Prisma.InputJsonValue;
          } else {
            updateData.profileData = Prisma.JsonNull;
          }
        }
      }

      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          profileData: true,
        },
      });
      this.logger.log(`[Update profile] Profile updated for user ${userId}`);
      return updated;
    } catch (error) {
      this.logger.error(`[Update profile] Error updating profile for user ${userId}:`, error);
      if (error instanceof Error) {
        this.logger.error(`[Update profile] Error message: ${error.message}`);
        this.logger.error(`[Update profile] Error stack: ${error.stack}`);
      }
      // Re-throw as HttpException if it's not already one
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
