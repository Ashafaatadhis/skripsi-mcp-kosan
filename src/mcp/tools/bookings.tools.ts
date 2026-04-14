import { Injectable } from "@nestjs/common";
import { RequestHandlerExtra, Resolver, Tool } from "@nestjs-mcp/server";
import { z } from "zod";
import { requireTenantUserId } from "../../auth/mcp-auth";
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
      roomId: z.string().describe("ID kamar yang akan dibooking (WAJIB)"),
      startDate: z
        .string()
        .describe("Tanggal mulai sewa, format YYYY-MM-DD (WAJIB)"),
      duration: z.number().min(1).describe("Lama sewa dalam bulan (WAJIB, minimal 1)"),
    },
  })
  async createBooking(params: {
    roomId: string;
    startDate: string;
    duration: number;
  }, extra: RequestHandlerExtra) {
    const tenantId = requireTenantUserId(extra);

    const result = await this.bookings.createBooking({
      roomId: params.roomId,
      tenantId,
      startDate: params.startDate,
      duration: params.duration,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_my_bookings",
    description: `Lihat daftar booking milik tenant yang sedang login.
  
Gunakan tool ini saat user bertanya tentang booking saya, sewa saya, kamar yang sedang saya tempati, atau butuh daftar booking terbaru.`,
    paramSchema: {}
  })
  async getMyBookings(_params: Record<string, never>, extra: RequestHandlerExtra) {
    const tenantId = requireTenantUserId(extra);
    const result = await this.bookings.listTenantBookings(tenantId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_booking_status",
    description: `Cek status booking yang sudah dibuat.`,
    paramSchema: {
      bookingId: z.string().describe("ID booking yang ingin dicek statusnya (gunakan Human ID seperti BKG-XXXX jika tersedia)"),
    },
  })
  async getBookingStatus(
    params: { bookingId: string },
    extra: RequestHandlerExtra,
  ) {
    const tenantId = requireTenantUserId(extra);
    const result = await this.bookings.getBookingStatus(params.bookingId, tenantId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "cancel_booking",
    description: `Batalkan booking aktif.`,
    paramSchema: {
      bookingId: z.string().describe("ID booking yang akan dibatalkan (gunakan Human ID seperti BKG-XXXX jika tersedia)"),
    },
  })
  async cancelBooking(
    params: { bookingId: string },
    extra: RequestHandlerExtra,
  ) {
    const tenantId = requireTenantUserId(extra);
    const result = await this.bookings.cancelBooking(params.bookingId, tenantId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
