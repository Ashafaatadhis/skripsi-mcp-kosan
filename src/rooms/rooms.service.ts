import { Injectable } from "@nestjs/common";
import { RoomStatus, RoomType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { KosanService } from "../kosan/kosan.service";

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kosanService: KosanService,
  ) {}

  async searchRooms(filters: {
    location?: string;
    maxPrice?: number;
    facilities?: string[];
    type?: RoomType;
  }) {
    const rooms = await this.prisma.room.findMany({
      where: {
        status: RoomStatus.available,
        ...(filters.maxPrice && { price: { lte: filters.maxPrice } }),
        ...(filters.type && { type: filters.type }),
        ...(filters.facilities?.length && {
          facilities: { hasEvery: filters.facilities },
        }),
      },
      include: { kosan: true },
      take: 10,
    });

    return { rooms, total: rooms.length };
  }

  async getRoomDetail(roomId: string) {
    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: { kosan: true },
    });
  }

  async addRoom(data: {
    ownerId: string;
    name: string;
    price: number;
    type: RoomType;
    facilities?: string[];
    description?: string;
  }) {
    const ownerKosan = await this.kosanService.getOwnerKosan(data.ownerId);

    if (!ownerKosan) {
      throw new Error("Owner does not have a kosan yet");
    }

    return this.prisma.room.create({
      data: {
        kosanId: ownerKosan.id,
        name: data.name,
        price: data.price,
        type: data.type,
        facilities: data.facilities ?? [],
        description: data.description,
        photos: [],
      },
    });
  }

  async updateRoom(
    roomId: string,
    data: Partial<{ name: string; price: number; facilities: string[]; description: string }>,
  ) {
    return this.prisma.room.update({ where: { id: roomId }, data });
  }

  async setRoomStatus(roomId: string, status: RoomStatus) {
    return this.prisma.room.update({ where: { id: roomId }, data: { status } });
  }

  async getOccupancyReport(ownerId: string) {
    const rooms = await this.prisma.room.findMany({
      where: { kosan: { ownerId } },
    });

    return {
      total: rooms.length,
      available: rooms.filter((r) => r.status === "available").length,
      occupied: rooms.filter((r) => r.status === "occupied").length,
      maintenance: rooms.filter((r) => r.status === "maintenance").length,
    };
  }
}
