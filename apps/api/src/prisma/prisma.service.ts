import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Defaults (maxWait 2s / timeout 5s) are too tight for a remote/managed
    // Postgres (e.g. Azure) where each query in an interactive transaction
    // pays network + SSL round-trip latency. Raise them so multi-step writes
    // like product create/update don't abort mid-transaction.
    super({
      transactionOptions: {
        maxWait: 15000,
        timeout: 30000,
      },
    });
  }

  async onModuleInit() {
    // The managed Azure Postgres can drop briefly / be mid-resume at boot.
    // Retry a few times, and if it's still down DON'T crash the process —
    // Prisma connects lazily on the first query, so the API stays up and
    // recovers automatically once the DB is reachable again (otherwise a
    // transient blip would exit the app and take down login until a restart).
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        if (attempt > 1) this.logger.log(`Database connected on attempt ${attempt}`);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`DB connect attempt ${attempt}/${maxAttempts} failed: ${message}`);
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        }
      }
    }
    this.logger.error(
      "Could not connect to the database at startup; continuing — Prisma will reconnect on first successful query."
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
