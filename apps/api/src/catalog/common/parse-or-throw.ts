
import { BadRequestException } from "@nestjs/common";

export function parseOrThrow<T>(
  result: { success: boolean; data?: T; error?: { issues?: Array<{ message?: string }> } },
  fallback: string
): T {
  if (!result.success) {
    throw new BadRequestException(result.error?.issues?.[0]?.message ?? fallback);
  }

  return result.data as T;
}
