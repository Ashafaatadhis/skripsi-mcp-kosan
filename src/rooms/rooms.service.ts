import { Injectable } from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapHouseSummary(house: any) {
    return {
      humanId: house.humanId,
      name: house.name,
      address: house.address,
      description: house.description,
      imageUrls: house.images?.map((img: any) => img.url) ?? [],
      roomCount: house._count?.rooms ?? house.rooms?.length ?? 0,
    };
  }

  private mapRoomSummary(room: any) {
    const bookedCount = room.bookings?.length ?? 0;
    const availableQuantity = Math.max((room.quantity ?? 0) - bookedCount, 0);

    return {
      humanId: room.humanId,
      name: room.name,
      monthlyPrice: room.monthlyPrice,
      quantity: room.quantity,
      availableQuantity,
      imageUrls: room.images?.map((img: any) => img.url) ?? [],
      facilities: room.facilities,
      kosan: room.kosan
        ? {
            humanId: room.kosan.humanId,
            name: room.kosan.name,
            address: room.kosan.address,
            imageUrls: room.kosan.images?.map((img: any) => img.url) ?? [],
          }
        : null,
    };
  }

  /**
   * Mengambil UUID asli dari Human ID (KSN- atau RM-)
   */
  private async resolveToUuid(id: string, type: "kosan" | "room"): Promise<string> {
    if (!id) return id;
    
    // Jika sudah UUID (tanpa prefix KSN/RM), langsung kembalikan
    if (!id.startsWith("KSN-") && !id.startsWith("RM-")) return id;

    if (type === "kosan" && id.startsWith("KSN-")) {
      const kosan = await this.prisma.kosan.findUnique({
        where: { humanId: id },
        select: { id: true }
      });
      return kosan?.id || id;
    }

    if (type === "room" && id.startsWith("RM-")) {
      const room = await this.prisma.room.findUnique({
        where: { humanId: id },
        select: { id: true }
      });
      return room?.id || id;
    }

    return id;
  }

  async searchRooms(filters: {
    query?: string;
    maxPrice?: number;
    kosanId?: string;
  }) {
    const query = filters.query?.trim();
    const resolvedKosanId = await this.resolveToUuid(filters.kosanId || "", "kosan");

    const rooms = await this.prisma.room.findMany({
      where: {
        ...(filters.maxPrice ? { monthlyPrice: { lte: filters.maxPrice } } : {}),
        ...(resolvedKosanId ? { kosanId: resolvedKosanId } : {}),
        ...(query
          ? {
              OR: [
                { humanId: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
                { kosan: { name: { contains: query, mode: "insensitive" } } },
                { kosan: { humanId: { contains: query, mode: "insensitive" } } },
                { kosan: { address: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        images: true,
        kosan: {
          include: {
            images: true,
          },
        },
        bookings: {
          where: { status: BookingStatus.active },
          select: { id: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
    });

    return {
      rooms: rooms.map((room) => this.mapRoomSummary(room)),
      total: rooms.length,
    };
  }

  async getRoomDetail(roomId: string) {
    const resolvedRoomId = await this.resolveToUuid(roomId, "room");

    const room = await this.prisma.room.findFirst({
      where: {
        OR: [
          { id: resolvedRoomId },
          { humanId: resolvedRoomId }
        ]
      },
      include: {
        images: true,
        kosan: {
          include: {
            images: true,
          },
        },
        bookings: {
          where: { status: BookingStatus.active },
          select: { id: true },
        },
      },
    });

    if (!room) {
      return null;
    }

    const mappedRoom = this.mapRoomSummary(room);

    return {
      ...mappedRoom,
      kosan: mappedRoom.kosan
        ? {
            ...mappedRoom.kosan,
            description: room.kosan.description,
          }
        : null,
    };
  }

  async searchHouses(filters: { query?: string }) {
    const query = filters.query?.trim();

    const houses = await this.prisma.kosan.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { humanId: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
                { address: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        images: true,
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
    });

    return houses.map((h) => this.mapHouseSummary(h));
  }

  async getHouseDetail(houseId: string) {
    const resolvedHouseId = await this.resolveToUuid(houseId, "kosan");

    const house = await this.prisma.kosan.findFirst({
      where: {
        OR: [
          { id: resolvedHouseId },
          { humanId: resolvedHouseId }
        ]
      },
      include: {
        images: true,
        _count: {
          select: { rooms: true },
        },
      },
    });

    if (!house) return null;

    return this.mapHouseSummary(house);
  }
}
