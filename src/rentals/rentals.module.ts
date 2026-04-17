import { Module, forwardRef } from "@nestjs/common";
import { RentalsService } from "./rentals.service";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [forwardRef(() => PaymentsModule)],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}
