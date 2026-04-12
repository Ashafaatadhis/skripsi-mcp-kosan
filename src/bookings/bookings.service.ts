import { Injectable } from "@nestjs/common";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private getBookingInclude() {
    return {
      room: {
        include: {
          kosan: true,
        },
      },
      tenant: true,
      payments: {
        orderBy: [{ dueDate: "asc" as const }, { createdAt: "asc" as const }],
      },
    };
  }

  async createBooking(data: {
    roomId: string;
    tenantId: string;
    startDate: string;
    duration: number;
  }) {
    if (!Number.isInteger(data.duration) || data.duration <= 0) {
      throw new Error("Durasi booking harus lebih dari 0 bulan");
    }

    const room = await this.prisma.room.findUnique({
      where: { id: data.roomId },
      include: {
        bookings: {
          where: { status: BookingStatus.active },
          select: { id: true },
        },
      },
    });

    if (!room) {
      throw new Error("Kamar tidak ditemukan");
    }

    if (room.bookings.length >= room.quantity) {
      throw new Error("Kamar tidak tersedia");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: data.tenantId },
      select: { id: true },
    });

    if (!tenant) {
      throw new Error("Tenant tidak ditemukan");
    }

    const startDate = new Date(data.startDate);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Tanggal mulai tidak valid");
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.duration);

    return this.prisma.booking.create({
      data: {
        roomId: data.roomId,
        tenantId: data.tenantId,
        startDate,
        endDate,
        status: BookingStatus.active,
        payments: {
          create: {
            amount: room.monthlyPrice,
            dueDate: startDate,
            status: PaymentStatus.pending,
            note: "Tagihan bulan pertama dibuat otomatis saat booking.",
          },
        },
      },
      include: this.getBookingInclude(),
    });
  }

  async listTenantBookings(tenantId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { tenantId },
      include: this.getBookingInclude(),
      orderBy: [{ createdAt: "desc" }],
    });

    return { bookings, total: bookings.length };
  }

  async getBookingStatus(bookingId: string, tenantId: string) {
    return this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      include: this.getBookingInclude(),
    });
  }

  async cancelBooking(bookingId: string, tenantId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      select: { id: true, status: true },
    });

    if (!booking) {
      throw new Error("Booking tidak ditemukan untuk tenant ini");
    }

    if (booking.status !== BookingStatus.active) {
      throw new Error("Hanya booking aktif yang bisa dibatalkan");
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.cancelled },
      include: this.getBookingInclude(),
    });
  }
}
