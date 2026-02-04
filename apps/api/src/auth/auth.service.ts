import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Role } from 'database';

const SALT_ROUNDS = 10;

export type JwtPayload = { sub: string; email: string; role: Role };

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
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
}
