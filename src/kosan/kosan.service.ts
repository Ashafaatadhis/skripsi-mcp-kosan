import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class KosanService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnerKosan(ownerId: string) {
    return this.prisma.kosan.findFirst({
      where: { ownerId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createKosan(data: {
    ownerId: string;
    name: string;
    address: string;
    description?: string;
  }) {
    return this.prisma.kosan.create({
      data: {
        ownerId: data.ownerId,
        name: data.name,
        address: data.address,
        description: data.description,
      },
    });
  }
}
