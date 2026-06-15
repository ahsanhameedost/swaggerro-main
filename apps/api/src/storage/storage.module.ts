import { Module } from "@nestjs/common";
import { StorageService } from "./storage.service";
import { StorageLocalController } from "./storage-local.controller";

@Module({
  controllers: [StorageLocalController],
  providers: [StorageService],
  exports: [StorageService]
})
export class StorageModule {}
