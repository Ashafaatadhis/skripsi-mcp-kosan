import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import {
  DiscoveryService as McpDiscoveryService,
  McpServerOptions,
  RegistryService,
  SessionManager,
} from "@nestjs-mcp/server";
import { RoomsModule } from "../rooms/rooms.module";
import { RentalsModule } from "../rentals/rentals.module";
import { PaymentsModule } from "../payments/payments.module";
import { UsersModule } from "../users/users.module";
import { MemoryModule } from "../memory/memory.module";
import { RoomsTools } from "./tools/rooms.tools";
import { RentalsTools } from "./tools/rentals.tools";
import { PaymentsTools } from "./tools/payments.tools";
import { ProfileTools } from "./tools/profile.tools";
import { MemoryTools } from "./tools/memory.tools";
import { CustomMcpController } from "./streamable.controller";
import { CustomMcpService } from "./streamable.service";
import { McpLoggerService } from "@nestjs-mcp/server/dist/registry/logger.service";

const MCP_SERVER_OPTIONS: McpServerOptions = {
  serverInfo: {
    name: "kosan-mcp",
    version: "1.0.0",
  },
  options: {},
  logging: {
    enabled: true,
    level: "verbose",
  },
};

const MCP_TRANSPORT_OPTIONS = {
  streamable: {
    enabled: false,
  },
  sse: {
    enabled: false,
  },
} as const;

@Module({
  imports: [
    DiscoveryModule,
    RoomsModule,
    RentalsModule,
    PaymentsModule,
    UsersModule,
    MemoryModule,
  ],
  providers: [
    RoomsTools,
    RentalsTools,
    PaymentsTools,
    ProfileTools,
    MemoryTools,
    McpDiscoveryService,
    RegistryService,
    SessionManager,
    McpLoggerService,
    {
      provide: "MCP_SERVER_OPTIONS",
      useValue: MCP_SERVER_OPTIONS,
    },
    {
      provide: "MCP_LOGGING_OPTIONS",
      useValue: MCP_SERVER_OPTIONS.logging,
    },
    {
      provide: "MCP_TRANSPORT_OPTIONS",
      useValue: MCP_TRANSPORT_OPTIONS,
    },
    CustomMcpService,
  ],
  controllers: [CustomMcpController],
})
export class McpModule {}
