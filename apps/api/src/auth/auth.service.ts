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
import {
  CompleteAccountSetupDto,
  VerifyAccountSetupDto
} from "./dto/account-setup.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

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

    // Approved sellers must finish account setup (verify email + set password)
    // via their one-time link before they can sign in.
    if ((userRow as { mustSetPassword?: boolean }).mustSetPassword) {
      throw new UnauthorizedException(
        "Please finish setting up your account using the link we emailed you."
      );
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

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true }
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (!bcrypt.compareSync(dto.currentPassword, user.passwordHash)) {
      throw new BadRequestException("Your current password is incorrect");
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: bcrypt.hashSync(dto.newPassword, 12), mustSetPassword: false }
    });
    return { ok: true };
  }

  // ---- account setup (seller onboarding: verify email + set credentials) ----

  async verifyAccountSetup(dto: VerifyAccountSetupDto) {
    const setup = await this.getValidSetupToken(dto.token);
    return { ok: true, email: setup.email };
  }

  async completeAccountSetup(dto: CompleteAccountSetupDto) {
    const setup = await this.getValidSetupToken(dto.token);
    const username = dto.username.trim();

    // Username must be unique (excluding the same user, in case they retry).
    const usernameOwner = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });
    if (usernameOwner && usernameOwner.id !== setup.userId) {
      throw new ConflictException("That username is taken");
    }

    const passwordHash = bcrypt.hashSync(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: setup.userId },
        data: {
          username,
          passwordHash,
          mustSetPassword: false,
          emailVerifiedAt: new Date()
        }
      }),
      // Invalidate this and any other outstanding setup tokens for the user.
      this.prisma.accountSetupToken.updateMany({
        where: { userId: setup.userId, usedAt: null },
        data: { usedAt: new Date() }
      })
    ]);

    const user = await this.users.findByIdWithPermissions(setup.userId);
    const token = await this.jwt.signAsync({
      sub: user!.id,
      email: user!.email,
      role: user!.role,
      permissions: user!.permissions
    });

    return { token, user };
  }

  private async getValidSetupToken(tokenInput: string) {
    const token = tokenInput.trim();
    const setup = await this.prisma.accountSetupToken.findFirst({
      where: { token, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    });
    if (!setup) {
      throw new BadRequestException("This setup link is invalid or has expired");
    }
    return setup;
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
