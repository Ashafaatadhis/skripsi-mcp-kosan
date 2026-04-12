import { Module } from "@nestjs/common";
import { McpModule as NestMcpModule } from "@nestjs-mcp/server";
import { RoomsModule } from "../rooms/rooms.module";
import { BookingsModule } from "../bookings/bookings.module";
import { PaymentsModule } from "../payments/payments.module";
import { UsersModule } from "../users/users.module";
import { MemoryModule } from "../memory/memory.module";
import { RoomsTools } from "./tools/rooms.tools";
import { BookingsTools } from "./tools/bookings.tools";
import { PaymentsTools } from "./tools/payments.tools";
import { ProfileTools } from "./tools/profile.tools";
import { MemoryTools } from "./tools/memory.tools";

@Module({
  imports: [
    NestMcpModule.forRoot({
      name: "kosan-mcp",
      version: "1.0.0",
      transports: {
        streamable: {
          enabled: true,
        },
      },
    }),
    RoomsModule,
    BookingsModule,
    PaymentsModule,
    UsersModule,
    MemoryModule,
  ],
  providers: [
    RoomsTools,
    BookingsTools,
    PaymentsTools,
    ProfileTools,
    MemoryTools,
  ],
})
export class McpModule {}
