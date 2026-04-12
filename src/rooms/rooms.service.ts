import { Injectable } from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { generateHumanId } from "../common/utils/id.util";

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async searchRooms(filters: {
    query?: string;
    maxPrice?: number;
    kosanId?: string;
  }) {
    const query = filters.query?.trim();

    const rooms = await this.prisma.room.findMany({
      where: {
        ...(filters.maxPrice ? { monthlyPrice: { lte: filters.maxPrice } } : {}),
        ...(filters.kosanId ? { kosanId: filters.kosanId } : {}),
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
        kosan: true,
        bookings: {
          where: { status: BookingStatus.active },
          select: { id: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
    });

    return {
      rooms: rooms.map((room) => {
        const bookedCount = room.bookings.length;
        const availableQuantity = Math.max(room.quantity - bookedCount, 0);

        return {
          id: room.id,
          humanId: room.humanId,
          name: room.name,
          monthlyPrice: room.monthlyPrice,
          quantity: room.quantity,
          availableQuantity,
          imageUrls: room.imageUrls,
          kosan: {
            id: room.kosan.id,
            humanId: room.kosan.humanId,
            name: room.kosan.name,
            address: room.kosan.address,
            imageUrls: room.kosan.imageUrls,
          },
        };
      }),
      total: rooms.length,
    };
  }

  async getRoomDetail(roomId: string) {
    const room = await this.prisma.room.findFirst({
      where: {
        OR: [
          { id: roomId },
          { humanId: roomId }
        ]
      },
      include: {
        kosan: true,
        bookings: {
          where: { status: BookingStatus.active },
          select: { id: true },
        },
      },
    });

    if (!room) {
      return null;
    }

    const bookedCount = room.bookings.length;
    const availableQuantity = Math.max(room.quantity - bookedCount, 0);

    return {
      id: room.id,
      humanId: room.humanId,
      name: room.name,
      monthlyPrice: room.monthlyPrice,
      quantity: room.quantity,
      availableQuantity,
      imageUrls: room.imageUrls,
      kosan: {
        id: room.kosan.id,
        humanId: room.kosan.humanId,
        name: room.kosan.name,
        address: room.kosan.address,
        description: room.kosan.description,
        imageUrls: room.kosan.imageUrls,
      },
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
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
    });

    return houses.map((h) => ({
      id: h.id,
      humanId: h.humanId,
      name: h.name,
      address: h.address,
      description: h.description,
      imageUrls: h.imageUrls,
      roomCount: h._count.rooms,
    }));
  }

  async getHouseDetail(houseId: string) {
    const house = await this.prisma.kosan.findFirst({
      where: {
        OR: [
          { id: houseId },
          { humanId: houseId }
        ]
      },
      include: {
        rooms: {
          include: {
            bookings: {
              where: { status: BookingStatus.active },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!house) return null;

    return {
      id: house.id,
      name: house.name,
      address: house.address,
      description: house.description,
      imageUrls: house.imageUrls,
      rooms: house.rooms.map((r) => {
        const bookedCount = r.bookings.length;
        const availableQuantity = Math.max(r.quantity - bookedCount, 0);
        return {
          id: r.id,
          humanId: r.humanId,
          name: r.name,
          monthlyPrice: r.monthlyPrice,
          availableQuantity,
          imageUrls: r.imageUrls,
        };
      }),
    };
  }
}
