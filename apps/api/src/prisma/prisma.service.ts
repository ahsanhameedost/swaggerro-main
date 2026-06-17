import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
