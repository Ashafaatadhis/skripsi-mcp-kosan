import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { generateHumanId } from "../common/utils/id.util";

@Injectable()
export class KosanService {
  constructor(private readonly prisma: PrismaService) {}

  async listOwnerKosan(ownerId: string) {
    return this.prisma.kosan.findMany({
      where: { ownerId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createKosan(data: {
    ownerId: string;
    name: string;
    address: string;
    description?: string;
    imageUrls?: string[];
  }) {
    return this.prisma.kosan.create({
      data: {
        humanId: generateHumanId('KSN'),
        ownerId: data.ownerId,
        name: data.name,
        address: data.address,
        description: data.description,
        images: {
          create: (data.imageUrls ?? []).map((url) => ({ url })),
        },
      },
    });
  }
}
