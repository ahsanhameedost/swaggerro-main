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

  /**
   * Run a DB operation, retrying only transient CONNECTION failures — e.g. the
   * managed Azure Postgres dropping an idle connection (P1001 "can't reach
   * server", P1017 "server closed the connection"). Safe to wrap a whole
   * `$transaction`: a dropped connection rolls the transaction back, so
   * re-running it can never double-apply. It is NOT safe (and not needed) for a
   * query that already executed — only pre-execution connection errors retry
   * here; every other error (validation, not-found, unique, etc.) is rethrown
   * immediately.
   */
  async withRetry<T>(fn: () => Promise<T>, label = "db operation"): Promise<T> {
    const transient = new Set(["P1001", "P1002", "P1008", "P1017"]);
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (!code || !transient.has(code) || attempt === 3) throw error;
        lastError = error;
        this.logger.warn(`Transient DB error ${code} during ${label} — retry ${attempt}/2`);
        try {
          await this.$connect();
        } catch {
          /* best-effort reconnect; the next attempt will surface any real error */
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
    throw lastError;
  }
}
