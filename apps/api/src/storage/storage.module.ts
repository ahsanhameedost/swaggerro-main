import { Module } from "@nestjs/common";
import { StorageService } from "./storage.service";
import { StorageLocalController } from "./storage-local.controller";
import { StorageProxyController } from "./storage-proxy.controller";

@Module({
  controllers: [StorageLocalController, StorageProxyController],
  providers: [StorageService],
  exports: [StorageService]
})
export class StorageModule {}
