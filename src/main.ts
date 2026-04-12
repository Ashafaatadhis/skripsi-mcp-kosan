import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { logMsg } from "./logging/logger.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  app.get(Logger).log(
    { event: "mcp_server_started", port },
    logMsg("SERVER_START", `MCP Server running on port ${port}`),
  );
}

bootstrap();
