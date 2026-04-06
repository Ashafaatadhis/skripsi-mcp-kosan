import { Injectable } from "@nestjs/common";
import { Resolver, Tool, ToolHandlerParams } from "@nestjs-mcp/server";
import { z } from "zod";
import { RoomType } from "@prisma/client";
import { RoomsService } from "../../rooms/rooms.service";
import { BookingsService } from "../../bookings/bookings.service";
import { PaymentsService } from "../../payments/payments.service";
import { ComplaintsService } from "../../complaints/complaints.service";

@Resolver()
@Injectable()
export class TenantTools {
  constructor(
    private readonly rooms: RoomsService,
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
    private readonly complaints: ComplaintsService,
  ) {}

  @Tool({
    name: "search_rooms",
    description: "Cari kamar kosan berdasarkan harga, fasilitas, dan tipe",
    paramSchema: {
      maxPrice: z.number().optional().describe("Harga maksimal per bulan (IDR)"),
      facilities: z.array(z.string()).optional().describe("Fasilitas yang dibutuhkan, contoh: ['AC', 'wifi']"),
      type: z.enum(["putra", "putri", "campur"]).optional().describe("Tipe kosan"),
    },
  })
  async searchRooms({ args }: ToolHandlerParams<{
    maxPrice: z.ZodOptional<z.ZodNumber>;
    facilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    type: z.ZodOptional<z.ZodEnum<["putra", "putri", "campur"]>>;
  }>) {
    const result = await this.rooms.searchRooms({
      maxPrice: args?.maxPrice,
      facilities: args?.facilities,
      type: args?.type as RoomType | undefined,
    });

    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_room_detail",
    description: "Lihat detail lengkap sebuah kamar",
    paramSchema: {
      roomId: z.string().describe("ID kamar"),
    },
  })
  async getRoomDetail({ args }: ToolHandlerParams<{ roomId: z.ZodString }>) {
    const result = await this.rooms.getRoomDetail(args!.roomId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "create_booking",
    description: "Buat booking kamar baru",
    paramSchema: {
      roomId: z.string(),
      tenantId: z.string(),
      startDate: z.string().describe("Format: YYYY-MM-DD"),
      duration: z.number().describe("Durasi dalam bulan"),
    },
  })
  async createBooking({ args }: ToolHandlerParams<{
    roomId: z.ZodString;
    tenantId: z.ZodString;
    startDate: z.ZodString;
    duration: z.ZodNumber;
  }>) {
    const result = await this.bookings.createBooking({
      roomId: args!.roomId,
      tenantId: args!.tenantId,
      startDate: args!.startDate,
      duration: args!.duration,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_booking_status",
    description: "Cek status booking",
    paramSchema: {
      bookingId: z.string(),
    },
  })
  async getBookingStatus({ args }: ToolHandlerParams<{ bookingId: z.ZodString }>) {
    const result = await this.bookings.getBookingStatus(args!.bookingId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "cancel_booking",
    description: "Batalkan booking",
    paramSchema: {
      bookingId: z.string(),
    },
  })
  async cancelBooking({ args }: ToolHandlerParams<{ bookingId: z.ZodString }>) {
    const result = await this.bookings.cancelBooking(args!.bookingId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "create_payment",
    description: "Buat link pembayaran sewa",
    paramSchema: {
      bookingId: z.string(),
    },
  })
  async createPayment({ args }: ToolHandlerParams<{ bookingId: z.ZodString }>) {
    const result = await this.payments.createPayment(args!.bookingId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_payment_status",
    description: "Cek status pembayaran",
    paramSchema: {
      paymentId: z.string(),
    },
  })
  async getPaymentStatus({ args }: ToolHandlerParams<{ paymentId: z.ZodString }>) {
    const result = await this.payments.getPaymentStatus(args!.paymentId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_payment_history",
    description: "Lihat riwayat pembayaran penyewa",
    paramSchema: {
      tenantId: z.string(),
    },
  })
  async getPaymentHistory({ args }: ToolHandlerParams<{ tenantId: z.ZodString }>) {
    const result = await this.payments.getPaymentHistory(args!.tenantId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "submit_complaint",
    description: "Lapor kerusakan atau masalah di kamar",
    paramSchema: {
      roomId: z.string(),
      tenantId: z.string(),
      description: z.string(),
      photoUrl: z.string().optional(),
    },
  })
  async submitComplaint({ args }: ToolHandlerParams<{
    roomId: z.ZodString;
    tenantId: z.ZodString;
    description: z.ZodString;
    photoUrl: z.ZodOptional<z.ZodString>;
  }>) {
    const result = await this.complaints.submitComplaint({
      roomId: args!.roomId,
      tenantId: args!.tenantId,
      description: args!.description,
      photoUrl: args!.photoUrl,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_complaint_status",
    description: "Cek status laporan kerusakan",
    paramSchema: {
      complaintId: z.string(),
    },
  })
  async getComplaintStatus({ args }: ToolHandlerParams<{ complaintId: z.ZodString }>) {
    const result = await this.complaints.getComplaintStatus(args!.complaintId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
