import { HttpException, HttpStatus, Injectable, Logger, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { Role } from 'database';

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 10;
const OTP_RATE_LIMIT_SECONDS = 60;
const OTP_LENGTH = 6;

export type JwtPayload = { sub: string; email: string; role: Role };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private queue: QueueService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user?.passwordHash) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
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
}
