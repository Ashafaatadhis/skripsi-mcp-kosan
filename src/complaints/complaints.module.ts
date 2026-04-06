import { Module } from "@nestjs/common";
import { ComplaintsService } from "./complaints.service";

@Module({
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
