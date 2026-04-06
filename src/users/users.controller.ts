import { Body, Controller, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PinoLogger } from "nestjs-pino";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UsersController.name);
  }

  @Post("register")
  async register(
    @Body() body: { telegramId: number; name: string; role: Role },
  ) {
    this.logger.info(
      {
        event: "user_register_request",
        telegramId: String(body.telegramId),
        role: body.role,
      },
      "Register user request received",
    );

    const user = await this.usersService.registerUser(
      body.telegramId,
      body.name,
      body.role,
    );

    this.logger.info(
      {
        event: "user_register_success",
        telegramId: user.telegramId ? user.telegramId.toString() : null,
        userId: user.id,
        role: user.role,
      },
      "User resolved successfully",
    );

    return {
      id: user.id,
      telegramId: user.telegramId ? user.telegramId.toString() : null,
      role: user.role,
      name: user.name,
      phone: user.phone,
      createdAt: user.createdAt,
    };
  }
}
