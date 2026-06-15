
import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { JwtModule } from "@nestjs/jwt";
import { env } from "../env";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [JwtModule.register({ secret: env.JWT_SECRET }), PrismaModule],
  providers: [UsersService, AuthGuard, RolesGuard, PermissionsGuard],
  controllers: [UsersController],
  exports: [UsersService]
})
export class UsersModule {}
