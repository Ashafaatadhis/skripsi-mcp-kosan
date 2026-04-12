import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async registerUser(telegramId: number, name?: string) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (existingTenant) {
      return existingTenant;
    }

    return this.prisma.tenant.create({
      data: {
        telegramId: BigInt(telegramId),
        name: name?.trim() || `Tenant ${telegramId}`,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  async findByTelegramId(telegramId: number) {
    return this.prisma.tenant.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
  }

  async getProfile(userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!tenant) {
      return { error: "User tidak ditemukan" };
    }

    return {
      id: tenant.id,
      name: tenant.name,
      phone: tenant.phone,
      memberSince: tenant.createdAt,
    };
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: userId },
    });

    if (!tenant) {
      return { error: "User tidak ditemukan" };
    }

    const updated = await this.prisma.tenant.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    return {
      message: "Profil berhasil diupdate",
      profile: updated,
    };
  }
}
