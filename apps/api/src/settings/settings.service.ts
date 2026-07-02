import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SETTING_DEFAULTS, type SettingKey, type SettingsMap } from "./settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Returns every known setting, overlaying stored values on top of the defaults
  // so callers always get a complete, typed map.
  async getAll(): Promise<SettingsMap> {
    const rows = await this.prisma.appSetting.findMany();
    const stored = new Map(rows.map((r) => [r.key, r.value]));
    const map = { ...SETTING_DEFAULTS } as SettingsMap;
    for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
      const value = stored.get(key);
      if (value != null) map[key] = value;
    }
    return map;
  }

  async set(key: SettingKey, value: string): Promise<SettingsMap> {
    await this.prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    return this.getAll();
  }

  // Convenience for other modules that need to read a boolean flag.
  async getBoolean(key: SettingKey): Promise<boolean> {
    const map = await this.getAll();
    return map[key] === "true";
  }
}
