import { Body, Controller, Post } from "@nestjs/common";
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
  async register(@Body() body: { telegramId: number; name?: string }) {
    this.logger.info(
      {
        event: "tenant_register_request",
        telegramId: String(body.telegramId),
        role: "tenant",
      },
      "Register tenant request received",
    );

    const tenant = await this.usersService.registerUser(body.telegramId, body.name);

    this.logger.info(
      {
        event: "tenant_register_success",
        telegramId: tenant.telegramId ? tenant.telegramId.toString() : null,
        userId: tenant.id,
        role: "tenant",
      },
      "Tenant resolved successfully",
    );

    return {
      id: tenant.id,
      telegramId: tenant.telegramId ? tenant.telegramId.toString() : null,
      role: "tenant",
      name: tenant.name,
      phone: tenant.phone,
      createdAt: tenant.createdAt,
    };
  }
}
