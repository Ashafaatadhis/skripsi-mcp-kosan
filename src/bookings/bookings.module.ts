import { Module, forwardRef } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [forwardRef(() => PaymentsModule)],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
