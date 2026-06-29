import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env";
import { AuthService } from "./auth.service";
import { loginSchema } from "./dto/login.dto";
import { signupSchema } from "./dto/signup.dto";
import { resetPasswordWithCodeSchema } from "./dto/reset-password-with-code.dto";
import { requestPasswordResetSchema } from "./dto/request-password-reset.dto";
import { AuthGuard } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { UsersService } from "../users/users.service";
import { updateProfileSchema } from "../users/user.dto";
import { verifyPasswordResetCodeSchema } from "./dto/verify-password-reset-code.dto";
import {
  completeAccountSetupSchema,
  verifyAccountSetupSchema
} from "./dto/account-setup.dto";
import { changePasswordSchema } from "./dto/change-password.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService
  ) {}

  @Post("signup")
  async signup(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const dto = signupSchema.parse(body);
    const { token, user } = await this.auth.signup(dto);

    reply.setCookie(env.COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return { user };
  }

  @Post("login")
  async login(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const dto = loginSchema.parse(body);
    const { token, user } = await this.auth.login(dto.email, dto.password);

    reply.setCookie(env.COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return { user };
  }

    @Post("forgot-password/request")
  async requestPasswordReset(@Body() body: unknown) {
    const dto = requestPasswordResetSchema.parse(body);
    return this.auth.requestPasswordResetCode(dto.email);
  }

  @Post("forgot-password/verify")
  async verifyPasswordReset(@Body() body: unknown) {
    const dto = verifyPasswordResetCodeSchema.parse(body);
    return this.auth.verifyPasswordResetCode(dto);
  }

  @Post("forgot-password/reset")
  async resetPassword(@Body() body: unknown) {
    const dto = resetPasswordWithCodeSchema.parse(body);
    return this.auth.resetPasswordWithCode(dto);
  }

  // Seller account setup (post-approval): verify the one-time link, then set
  // username + password. Completing it logs the seller in via the auth cookie.
  @Post("account-setup/verify")
  async verifyAccountSetup(@Body() body: unknown) {
    const dto = verifyAccountSetupSchema.parse(body);
    return this.auth.verifyAccountSetup(dto);
  }

  @Post("account-setup/complete")
  async completeAccountSetup(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const dto = completeAccountSetupSchema.parse(body);
    const { token, user } = await this.auth.completeAccountSetup(dto);

    reply.setCookie(env.COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return { user };
  }

  // Self-service password change for any logged-in user.
  @UseGuards(AuthGuard)
  @Post("change-password")
  async changePassword(
    @Req() req: FastifyRequest & { user?: { sub: string } },
    @Body() body: unknown
  ) {
    const dto = changePasswordSchema.parse(body);
    return this.auth.changePassword(req.user!.sub, dto);
  }

  @UseGuards(AuthGuard)
  @Get("me")
  async me(@Req() req: FastifyRequest & { user?: { sub: string } }) {
    const userId = req.user!.sub;
    const user = await this.users.findByIdWithPermissions(userId);
    return { user };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("profile.update")
  @Patch("me")
  async updateMe(
    @Req() req: FastifyRequest & { user?: { sub: string } },
    @Body() body: unknown
  ) {
    const userId = req.user!.sub;
    const dto = updateProfileSchema.parse(body);
    const user = await this.users.updateProfile(userId, dto);
    return { user };
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie(env.COOKIE_NAME, { path: "/" });
    return { ok: true };
  }
}
