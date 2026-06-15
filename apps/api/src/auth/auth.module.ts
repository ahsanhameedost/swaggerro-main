import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { BullModule } from "@nestjs/bullmq";
import { env } from "../env";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";
import { AuthGuard } from "../common/guards/auth.guard";
import { EMAIL_QUEUE } from "../email/email.constants";

@Module({
  imports: [
    UsersModule,
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: env.JWT_EXPIRES_IN as any }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [JwtModule, AuthGuard]
})
export class AuthModule {}
