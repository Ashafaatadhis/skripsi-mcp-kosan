import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async registerUser(telegramId: number, name: string, role: Role) {
    const existingUser = await this.prisma.user.findFirst({
      where: { telegramId: BigInt(telegramId), role },
    });

    if (existingUser) {
      return existingUser;
    }

    return this.prisma.user.create({
      data: {
        telegramId: BigInt(telegramId),
        name,
        role,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByTelegramIdAndRole(telegramId: number, role: Role) {
    return this.prisma.user.findFirst({
      where: {
        telegramId: BigInt(telegramId),
        role,
      },
    });
  }
}
