import { Injectable } from "@nestjs/common";
import { Resolver, Tool } from "@nestjs-mcp/server";
import { z } from "zod";
import { BookingsService } from "../../bookings/bookings.service";

@Resolver()
@Injectable()
export class BookingsTools {
  constructor(private readonly bookings: BookingsService) {}

  @Tool({
    name: "create_booking",
    description: `Buat booking kamar baru untuk penyewa.
  
PENTING: Semua parameter WAJIB diisi.
Booking yang dibuat akan langsung tercatat dan bisa dilihat owner dari web admin.

Parameter WAJIB:
- roomId: ID kamar yang akan dibooking
- startDate: tanggal mulai sewa, format YYYY-MM-DD
- duration: lama sewa dalam bulan`,
    paramSchema: {
      userId: z.string().nullable().optional(),
      roomId: z.string().describe("ID kamar yang akan dibooking (WAJIB)"),
      startDate: z
        .string()
        .describe("Tanggal mulai sewa, format YYYY-MM-DD (WAJIB)"),
      duration: z.number().describe("Lama sewa dalam bulan (WAJIB)"),
    },
  })
  async createBooking(params: {
    userId: string | null;
    roomId: string;
    startDate: string;
    duration: number;
  }) {
    const result = await this.bookings.createBooking({
      roomId: params.roomId,
      tenantId: params.userId!,
      startDate: params.startDate,
      duration: params.duration,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_my_bookings",
    description: `Lihat daftar booking milik tenant yang sedang login.
  
Gunakan tool ini saat user bertanya tentang booking saya, sewa saya, kamar yang sedang saya tempati, atau butuh daftar booking terbaru.`,
    paramSchema: {
      userId: z.string().nullable().optional()
    }
  })
  async getMyBookings(params: { userId: string | null }) {
    const result = await this.bookings.listTenantBookings(params.userId!);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_booking_status",
    description: `Cek status booking yang sudah dibuat.`,
    paramSchema: {
      userId: z.string().nullable().optional(),
      bookingId: z.string().describe("ID booking yang ingin dicek statusnya (WAJIB)"),
    },
  })
  async getBookingStatus(params: { userId: string | null; bookingId: string }) {
    const result = await this.bookings.getBookingStatus(params.bookingId, params.userId!);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "cancel_booking",
    description: `Batalkan booking aktif.`,
    paramSchema: {
      userId: z.string().nullable().optional(),
      bookingId: z.string().describe("ID booking yang akan dibatalkan (WAJIB)"),
    },
  })
  async cancelBooking(params: { userId: string | null; bookingId: string }) {
    const result = await this.bookings.cancelBooking(params.bookingId, params.userId!);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
