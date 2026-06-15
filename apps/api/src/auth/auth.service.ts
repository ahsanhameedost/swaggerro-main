import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Queue } from "bullmq";
import { UsersService } from "../users/users.service";
import type { SignupDto } from "./dto/signup.dto";
import {
  EMAIL_QUEUE,
  JOB_PASSWORD_RESET_CODE_EMAIL,
  JOB_PASSWORD_RESET_SUCCESS_EMAIL,
  JOB_SIGNUP_WELCOME_EMAIL
} from "../email/email.constants";
import { PrismaService } from "../prisma/prisma.service";
import { ResetPasswordWithCodeDto } from "./dto/reset-password-with-code.dto";
import { VerifyPasswordResetCodeDto } from "./dto/verify-password-reset-code.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.users.findByEmail(email);

    if (existing) {
      throw new ConflictException("Email already in use");
    }

    const passwordHash = bcrypt.hashSync(dto.password, 12);
    const created = await this.users.createUser({
      email,
      passwordHash,
      firstName: dto.firstName?.trim(),
      lastName: dto.lastName?.trim(),
      phone: dto.phone?.trim()
    });

    await this.emailQueue.add(
      JOB_SIGNUP_WELCOME_EMAIL,
      { userId: created.id },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    const user = await this.users.findByIdWithPermissions(created.id);

    const token = await this.jwt.signAsync({
      sub: user!.id,
      email: user!.email,
      role: user!.role,
      permissions: user!.permissions
    });

    return { token, user };
  }

  async login(email: string, password: string) {
    const userRow = await this.users.findByEmail(email.trim().toLowerCase());
    if (!userRow) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValid = bcrypt.compareSync(password, userRow.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = await this.users.findByIdWithPermissions(userRow.id);

    const token = await this.jwt.signAsync({
      sub: user!.id,
      email: user!.email,
      role: user!.role,
      permissions: user!.permissions
    });

    return { token, user };
  }

    async requestPasswordResetCode(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.users.findByEmail(email);

    if (!user) {
      throw new NotFoundException("No user found with this email address");
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.passwordResetCode.deleteMany({
      where: { userId: user.id, usedAt: null }
    });

    await this.prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        email: user.email,
        code,
        expiresAt
      }
    });

    await this.emailQueue.add(
      JOB_PASSWORD_RESET_CODE_EMAIL,
      { userId: user.id, code },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    return {
      ok: true,
      email: user.email,
      expiresInSeconds: 600
    };
  }

  async verifyPasswordResetCode(dto: VerifyPasswordResetCodeDto) {
    const match = await this.getValidResetCode(dto.email, dto.code);
    if (!match) {
      throw new BadRequestException("Invalid or expired code");
    }

    return {
      ok: true,
      expiresAt: match.expiresAt.toISOString()
    };
  }

  async resetPasswordWithCode(dto: ResetPasswordWithCodeDto) {
    const match = await this.getValidResetCode(dto.email, dto.code);
    if (!match) {
      throw new BadRequestException("Invalid or expired code");
    }

    const passwordHash = bcrypt.hashSync(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: match.userId },
        data: { passwordHash }
      }),
      this.prisma.passwordResetCode.updateMany({
        where: { userId: match.userId, usedAt: null },
        data: { usedAt: new Date() }
      })
    ]);

    await this.emailQueue.add(
      JOB_PASSWORD_RESET_SUCCESS_EMAIL,
      { userId: match.userId },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    return { ok: true };
  }

  private async getValidResetCode(emailInput: string, codeInput: string) {
    const email = emailInput.trim().toLowerCase();
    const code = codeInput.trim();
    const user = await this.users.findByEmail(email);

    if (!user) {
      throw new NotFoundException("No user found with this email address");
    }

    return this.prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        email,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
  }
}
