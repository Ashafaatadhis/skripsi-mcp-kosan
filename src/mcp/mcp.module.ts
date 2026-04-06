import { Module } from "@nestjs/common";
import { McpModule as NestMcpModule } from "@nestjs-mcp/server";
import { RoomsModule } from "../rooms/rooms.module";
import { BookingsModule } from "../bookings/bookings.module";
import { PaymentsModule } from "../payments/payments.module";
import { ComplaintsModule } from "../complaints/complaints.module";
import { TenantTools } from "./tools/tenant.tools";
import { OwnerTools } from "./tools/owner.tools";

@Module({
  imports: [
    NestMcpModule.forRoot({
      name: "kosan-mcp",
      version: "0.1.0",
      transports: {
        streamable: {
          enabled: true,
        },
      },
    }),
    RoomsModule,
    BookingsModule,
    PaymentsModule,
    ComplaintsModule,
  ],
  providers: [TenantTools, OwnerTools],
})
export class McpModule {}
