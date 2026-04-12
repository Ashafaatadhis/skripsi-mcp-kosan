import { Injectable } from "@nestjs/common";
import { Resolver, Tool } from "@nestjs-mcp/server";
import { z } from "zod";
import { RoomsService } from "../../rooms/rooms.service";

@Resolver()
@Injectable()
export class RoomsTools {
  constructor(private readonly rooms: RoomsService) {}

  @Tool({
    name: "search_houses",
    description: `Cari bangunan kosan (property). Kata kunci bebas (nama/alamat). BIARKAN KOSONG (null) jika user hanya ingin melihat daftar kosan secara umum atau baru mulai cari.`,
    paramSchema: {
      userId: z.string().nullable().optional(),
      query: z
        .string()
        .nullable()
        .optional()
        .describe("Kata kunci nama kosan atau alamat. Masukkan null jika ingin melihat semua kosan."),
    },
  })
  async searchHouses(params: { userId: string | null; query?: string | null }) {
    const result = await this.rooms.searchHouses({
      query: params.query ?? undefined,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_house_detail",
    description: `Lihat detail bangunan kosan dan DAFTAR KAMAR yang ada di dalamnya. Gunakan tool ini setelah user memilih salah satu kosan dari hasil pencarian untuk melihat fasilitas bangunan dan tipe kamar apa saja yang tersedia.`,
    paramSchema: {
      userId: z.string().nullable().optional(),
      houseId: z.string().describe("ID kosan yang ingin dilihat detailnya"),
    },
  })
  async getHouseDetail(params: { userId: string | null; houseId: string }) {
    const result = await this.rooms.getHouseDetail(params.houseId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_room_detail",
    description: `Lihat detail lengkap sebuah kamar (harga, foto, fasilitas).`,
    paramSchema: {
      userId: z.string().nullable().optional(),
      roomId: z.string().describe("ID kamar yang ingin dilihat detailnya"),
    },
  })
  async getRoomDetail(params: { userId: string | null; roomId: string }) {
    const result = await this.rooms.getRoomDetail(params.roomId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "search_rooms",
    description: `Cari kamar tersedia. Bisa langsung cari di semua kosan, atau difilter ke kosan tertentu. BIARKAN query KOSONG (null) jika hanya ingin browsing atau filter harga tanpa kata kunci spesifik.`,
    paramSchema: {
      userId: z.string().nullable().optional(),
      query: z.string().nullable().optional().describe("Kata kunci nama kamar atau fasilitas"),
      maxPrice: z.number().nullable().optional().describe("Harga maksimal per bulan"),
      kosanId: z.string().nullable().optional().describe("ID kosan jika ingin memfilter ke kosan tertentu"),
    },
  })
  async searchRooms(params: {
    userId: string | null;
    query?: string | null;
    maxPrice?: number | null;
    kosanId?: string | null;
  }) {
    const result = await this.rooms.searchRooms({
      query: params.query ?? undefined,
      maxPrice: params.maxPrice ?? undefined,
      kosanId: params.kosanId ?? undefined,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
