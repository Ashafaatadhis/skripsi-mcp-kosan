import { Injectable } from "@nestjs/common";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { generateHumanId, normalizeId } from "../common/utils/id.util";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private getBookingInclude() {
    return {
      room: {
        include: {
          images: true,
          kosan: {
            include: {
              images: true,
            },
          },
        },
      },
      payments: {
        orderBy: [{ dueDate: "asc" as const }, { createdAt: "asc" as const }],
      },
    };
  }

  private mapPaymentSummary(payment: any) {
    return {
      humanId: payment.humanId,
      amount: payment.amount,
      dueDate: payment.dueDate,
      paidAt: payment.paidAt,
      status: payment.status,
      note: payment.note,
    };
  }

  private mapRoomSummary(room: any) {
    return {
      humanId: room.humanId,
      name: room.name,
      monthlyPrice: room.monthlyPrice,
      imageUrls: room.images?.map((image: any) => image.url) ?? [],
      kosan: room.kosan
        ? {
            humanId: room.kosan.humanId,
            name: room.kosan.name,
            address: room.kosan.address,
            imageUrls: room.kosan.images?.map((image: any) => image.url) ?? [],
          }
        : null,
    };
  }

  private mapBooking(booking: any) {
    return {
      humanId: booking.humanId,
      status: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      note: booking.note,
      room: booking.room ? this.mapRoomSummary(booking.room) : null,
      payments: booking.payments?.map((payment: any) => this.mapPaymentSummary(payment)) ?? [],
    };
  }

  /**
   * Mengambil UUID asli dari Human ID (KSN-, RM-, BKG-, atau PYM-)
   */
  private async resolveToUuid(id: string, type: "kosan" | "room" | "booking" | "payment"): Promise<string> {
    if (!id) return id;
    
    // Jika sudah UUID (tanpa prefix human-readable), langsung kembalikan
    if (!id.startsWith("KSN-") && !id.startsWith("RM-") && !id.startsWith("BKG-") && !id.startsWith("PYM-")) return id;

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

    if (type === "booking" && id.startsWith("BKG-")) {
      const booking = await this.prisma.booking.findUnique({
        where: { humanId: id },
        select: { id: true }
      });
      return booking?.id || id;
    }

    if (type === "payment" && id.startsWith("PYM-")) {
      const payment = await this.prisma.payment.findUnique({
        where: { humanId: id },
        select: { id: true }
      });
      return payment?.id || id;
    }

    return id;
  }

  async createBooking(data: {
    roomId: string;
    tenantId: string;
    startDate: string;
    duration: number;
  }) {
    // Normalisasi input
    data.roomId = normalizeId(data.roomId);
    data.tenantId = normalizeId(data.tenantId);

    // TERJEMAHKAN ID Human ke UUID asli
    const resolvedRoomId = await this.resolveToUuid(data.roomId, "room");

    console.log('[BOOKING_DEBUG] Creating booking for:', { ...data, resolvedRoomId });
    if (!Number.isInteger(data.duration) || data.duration <= 0) {
      throw new Error("Durasi booking harus lebih dari 0 bulan");
    }

    const room = await this.prisma.room.findUnique({
      where: { id: resolvedRoomId },
      include: {
        bookings: {
          where: { status: BookingStatus.active },
          select: { id: true },
        },
      },
    });

    if (!room) {
      console.log('[BOOKING_DEBUG] Room not found:', resolvedRoomId);
      throw new Error("Kamar tidak ditemukan");
    }
    console.log('[BOOKING_DEBUG] Room found:', room.name, 'Available:', room.quantity - room.bookings.length);

    if (room.bookings.length >= room.quantity) {
      throw new Error("Kamar tidak tersedia");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: data.tenantId },
      select: { id: true },
    });

    if (!tenant) {
      console.log('[BOOKING_DEBUG] Tenant not found:', data.tenantId);
      throw new Error("Tenant tidak ditemukan");
    }
    console.log('[BOOKING_DEBUG] Tenant found, proceeding to create booking');

    const startDate = new Date(data.startDate);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Tanggal mulai tidak valid");
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.duration);

    const booking = await this.prisma.booking.create({
      data: {
        humanId: generateHumanId("BKG"),
        roomId: room.id,
        tenantId: data.tenantId,
        startDate,
        endDate,
        status: BookingStatus.active,
        payments: {
          create: {
            humanId: generateHumanId("PYM"),
            amount: room.monthlyPrice,
            dueDate: startDate,
            status: PaymentStatus.pending,
            note: "Tagihan bulan pertama dibuat otomatis saat booking.",
          },
        },
      },
      include: this.getBookingInclude(),
    });

    return this.mapBooking(booking);
  }

  async listTenantBookings(tenantId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { tenantId },
      include: this.getBookingInclude(),
      orderBy: [{ createdAt: "desc" }],
    });

    return {
      bookings: bookings.map((booking) => this.mapBooking(booking)),
      total: bookings.length,
    };
  }

  async getBookingStatus(bookingId: string, tenantId: string) {
    const resolvedBookingId = await this.resolveToUuid(normalizeId(bookingId), "booking");

    const booking = await this.prisma.booking.findFirst({
      where: { id: resolvedBookingId, tenantId },
      include: this.getBookingInclude(),
    });

    return booking ? this.mapBooking(booking) : null;
  }

  async cancelBooking(bookingId: string, tenantId: string) {
    const resolvedBookingId = await this.resolveToUuid(normalizeId(bookingId), "booking");

    const existingBooking = await this.prisma.booking.findFirst({
      where: { id: resolvedBookingId, tenantId },
      select: { id: true, status: true },
    });

    if (!existingBooking) {
      throw new Error("Booking tidak ditemukan untuk tenant ini");
    }

    if (existingBooking.status !== BookingStatus.active) {
      throw new Error("Hanya booking aktif yang bisa dibatalkan");
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: resolvedBookingId },
      data: { status: BookingStatus.cancelled },
      include: this.getBookingInclude(),
    });

    return {
      message: `Booking ${updatedBooking.humanId} berhasil dibatalkan.`,
      booking: this.mapBooking(updatedBooking),
    };
  }
}
