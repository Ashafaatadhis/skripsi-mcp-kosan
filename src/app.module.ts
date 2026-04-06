import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { KosanModule } from "./kosan/kosan.module";
import { RoomsModule } from "./rooms/rooms.module";
import { BookingsModule } from "./bookings/bookings.module";
import { PaymentsModule } from "./payments/payments.module";
import { ComplaintsModule } from "./complaints/complaints.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { McpModule } from "./mcp/mcp.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        timestamp: true,
        base: {
          app: "kosan-mcp",
          env: process.env.NODE_ENV ?? "development",
        },
        redact: ["req.headers.authorization", "authorization"],
        customProps(req) {
          return {
            requestId: req.id,
          };
        },
      },
    }),
    PrismaModule,
    UsersModule,
    KosanModule,
    RoomsModule,
    BookingsModule,
    PaymentsModule,
    ComplaintsModule,
    NotificationsModule,
    McpModule,
  ],
})
export class AppModule {}
