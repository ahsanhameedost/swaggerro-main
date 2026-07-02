import { BadRequestException, Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { updateSettingSchema } from "./settings.dto";
import { SettingsService } from "./settings.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings.read")
  async getAll() {
    return { settings: await this.settings.getAll() };
  }

  @Patch()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings.write")
  async update(@Body() body: unknown) {
    const parsed = updateSettingSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid setting");
    }
    return { settings: await this.settings.set(parsed.data.key, parsed.data.value) };
  }
}
