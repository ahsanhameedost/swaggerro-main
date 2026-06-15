import { Module } from "@nestjs/common";
import { RbacController } from "./rbac.controller";
import { RbacService } from "./rbac.service";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PermissionsGuard } from "../common/guards/permissions.guard";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [RbacController],
  providers: [RbacService, PermissionsGuard]
})
export class RbacModule {}
