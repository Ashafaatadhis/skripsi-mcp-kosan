import { Module } from "@nestjs/common";
import { KosanController } from "./kosan.controller";
import { KosanService } from "./kosan.service";

@Module({
  controllers: [KosanController],
  providers: [KosanService],
  exports: [KosanService],
})
export class KosanModule {}
