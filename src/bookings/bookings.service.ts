import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BookingStatus } from "@prisma/client";

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBooking(data: {
    roomId: string;
    tenantId: string;
    startDate: string;
    duration: number;
  }) {
    const start = new Date(data.startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + data.duration);

    return this.prisma.booking.create({
      data: {
        roomId: data.roomId,
        tenantId: data.tenantId,
        startDate: start,
        endDate: end,
        status: BookingStatus.pending,
      },
    });
  }

  async getBookingStatus(bookingId: string) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true },
    });
  }

  async cancelBooking(bookingId: string) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.cancelled },
    });
  }

  async listPendingBookings(ownerId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.pending,
        room: { kosan: { ownerId } },
      },
      include: { room: true, tenant: true },
    });
    return { bookings, total: bookings.length };
  }

  async confirmBooking(bookingId: string) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.confirmed },
    });
  }

  async rejectBooking(bookingId: string, reason?: string) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.rejected },
    });
  }
}
