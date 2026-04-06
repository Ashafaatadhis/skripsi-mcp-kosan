import { Module } from "@nestjs/common";
import { KosanModule } from "../kosan/kosan.module";
import { RoomsService } from "./rooms.service";

@Module({
  imports: [KosanModule],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
