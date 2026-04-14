import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { BotAuthMiddleware } from "./auth/bot-auth.middleware";
import { loggerConfig } from "./logging/logger.config";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { KosanModule } from "./kosan/kosan.module";
import { RoomsModule } from "./rooms/rooms.module";
import { BookingsModule } from "./bookings/bookings.module";
import { PaymentsModule } from "./payments/payments.module";
import { McpModule } from "./mcp/mcp.module";
import { MemoryModule } from "./memory/memory.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(loggerConfig),
    PrismaModule,
    UsersModule,
    KosanModule,
    RoomsModule,
    BookingsModule,
    PaymentsModule,
    MemoryModule,
    McpModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BotAuthMiddleware).forRoutes(
      { path: "mcp", method: RequestMethod.ALL },
      { path: "sse", method: RequestMethod.ALL },
      { path: "users/register", method: RequestMethod.POST },
    );
  }
}
