import { Injectable } from "@nestjs/common";
import { Resolver, Tool, ToolHandlerParams } from "@nestjs-mcp/server";
import { ComplaintStatus, RoomStatus, RoomType } from "@prisma/client";
import { z } from "zod";
import { RoomsService } from "../../rooms/rooms.service";
import { BookingsService } from "../../bookings/bookings.service";
import { PaymentsService } from "../../payments/payments.service";
import { ComplaintsService } from "../../complaints/complaints.service";

@Resolver()
@Injectable()
export class OwnerTools {
  constructor(
    private readonly rooms: RoomsService,
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
    private readonly complaints: ComplaintsService,
  ) {}

  @Tool({
    name: "add_room",
    description: "Tambah kamar baru ke kosan milik owner",
    paramSchema: {
      ownerId: z.string(),
      name: z.string(),
      price: z.number().describe("Harga sewa per bulan (IDR)"),
      type: z.enum(["putra", "putri", "campur"]),
      facilities: z.array(z.string()).optional(),
      description: z.string().optional(),
    },
  })
  async addRoom({ args }: ToolHandlerParams<{
    ownerId: z.ZodString;
    name: z.ZodString;
    price: z.ZodNumber;
    type: z.ZodEnum<["putra", "putri", "campur"]>;
    facilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
  }>) {
    const result = await this.rooms.addRoom({
      ownerId: args!.ownerId,
      name: args!.name,
      price: args!.price,
      type: args!.type as RoomType,
      facilities: args!.facilities,
      description: args!.description,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "update_room",
    description: "Update informasi kamar",
    paramSchema: {
      roomId: z.string(),
      name: z.string().optional(),
      price: z.number().optional(),
      facilities: z.array(z.string()).optional(),
      description: z.string().optional(),
    },
  })
  async updateRoom({ args }: ToolHandlerParams<{
    roomId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodNumber>;
    facilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
  }>) {
    const result = await this.rooms.updateRoom(args!.roomId, {
      name: args!.name,
      price: args!.price,
      facilities: args!.facilities,
      description: args!.description,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "set_room_status",
    description: "Update status kamar",
    paramSchema: {
      roomId: z.string(),
      status: z.enum(["available", "occupied", "maintenance"]),
    },
  })
  async setRoomStatus({ args }: ToolHandlerParams<{
    roomId: z.ZodString;
    status: z.ZodEnum<["available", "occupied", "maintenance"]>;
  }>) {
    const result = await this.rooms.setRoomStatus(
      args!.roomId,
      args!.status as RoomStatus,
    );
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "list_pending_bookings",
    description: "Lihat daftar booking yang menunggu konfirmasi",
    paramSchema: {
      ownerId: z.string(),
    },
  })
  async listPendingBookings({ args }: ToolHandlerParams<{ ownerId: z.ZodString }>) {
    const result = await this.bookings.listPendingBookings(args!.ownerId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "confirm_booking",
    description: "Konfirmasi booking penyewa",
    paramSchema: {
      bookingId: z.string(),
    },
  })
  async confirmBooking({ args }: ToolHandlerParams<{ bookingId: z.ZodString }>) {
    const result = await this.bookings.confirmBooking(args!.bookingId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "reject_booking",
    description: "Tolak booking penyewa",
    paramSchema: {
      bookingId: z.string(),
      reason: z.string().optional(),
    },
  })
  async rejectBooking({ args }: ToolHandlerParams<{
    bookingId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
  }>) {
    const result = await this.bookings.rejectBooking(args!.bookingId, args!.reason);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_occupancy_report",
    description: "Laporan hunian kamar (terisi vs kosong)",
    paramSchema: {
      ownerId: z.string(),
    },
  })
  async getOccupancyReport({ args }: ToolHandlerParams<{ ownerId: z.ZodString }>) {
    const result = await this.rooms.getOccupancyReport(args!.ownerId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_payment_report",
    description: "Laporan pembayaran bulanan",
    paramSchema: {
      ownerId: z.string(),
      month: z.string().optional().describe("Format: YYYY-MM"),
    },
  })
  async getPaymentReport({ args }: ToolHandlerParams<{
    ownerId: z.ZodString;
    month: z.ZodOptional<z.ZodString>;
  }>) {
    const result = await this.payments.getPaymentReport(args!.ownerId, args!.month);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "list_complaints",
    description: "Lihat daftar komplain penyewa",
    paramSchema: {
      ownerId: z.string(),
      status: z.enum(["open", "in_progress", "resolved"]).optional(),
    },
  })
  async listComplaints({ args }: ToolHandlerParams<{
    ownerId: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<["open", "in_progress", "resolved"]>>;
  }>) {
    const result = await this.complaints.listComplaints(
      args!.ownerId,
      args!.status as ComplaintStatus | undefined,
    );
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
