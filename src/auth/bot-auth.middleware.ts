import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { BOT_AUTH_HEADERS, hasValidBotSecret } from "./mcp-auth";

@Injectable()
export class BotAuthMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const botSecret = request.headers[BOT_AUTH_HEADERS.botSecret];

    if (!hasValidBotSecret(botSecret)) {
      response.status(401).json({ message: "Unauthorized bot client." });
      return;
    }

    next();
  }
}
