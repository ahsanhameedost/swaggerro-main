import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env";
import { AuthService } from "./auth.service";
import { loginSchema } from "./dto/login.dto";
import { signupSchema } from "./dto/signup.dto";
import { resetPasswordWithCodeSchema } from "./dto/reset-password-with-code.dto";
import { requestPasswordResetSchema } from "./dto/request-password-reset.dto";
import { AuthGuard } from "../common/guards/auth.guard";
import { UsersService } from "../users/users.service";
import { verifyPasswordResetCodeSchema } from "./dto/verify-password-reset-code.dto";

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

  @UseGuards(AuthGuard)
  @Get("me")
  async me(@Req() req: FastifyRequest & { user?: { sub: string } }) {
    const userId = req.user!.sub;
    const user = await this.users.findByIdWithPermissions(userId);
    return { user };
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie(env.COOKIE_NAME, { path: "/" });
    return { ok: true };
  }
}
