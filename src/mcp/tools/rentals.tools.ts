import { Injectable } from "@nestjs/common";
import { RequestHandlerExtra, Resolver, Tool } from "@nestjs-mcp/server";
import { z } from "zod";
import { requireTenantUserId } from "../../auth/mcp-auth";
import { RentalsService } from "../../rentals/rentals.service";

@Resolver()
@Injectable()
export class RentalsTools {
  constructor(private readonly rentals: RentalsService) {}

  @Tool({
    name: "create_rental",
    description: `Buat sewa kamar baru untuk penyewa.
  
PENTING: Semua parameter WAJIB diisi.
Sewa yang dibuat akan langsung tercatat dan bisa dilihat owner dari web admin.

Parameter WAJIB:
- roomId: ID kamar yang akan disewa
- startDate: tanggal mulai sewa, format YYYY-MM-DD`,
    paramSchema: {
      roomId: z.string().describe("ID kamar yang akan disewa (WAJIB)"),
      startDate: z
        .string()
        .describe("Tanggal mulai sewa, format YYYY-MM-DD (WAJIB)"),
    },
  })
  async createRental(params: {
    roomId: string;
    startDate: string;
  }, extra: RequestHandlerExtra) {
    const tenantId = requireTenantUserId(extra);

    const result = await this.rentals.createRental({
      roomId: params.roomId,
      tenantId,
      startDate: params.startDate,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_my_rentals",
    description: `Lihat daftar sewa milik tenant yang sedang login.
  
Gunakan tool ini saat user bertanya tentang sewa saya, kamar yang sedang saya tempati, atau butuh daftar sewa terbaru.`,
    paramSchema: {}
  })
  async getMyRentals(_params: Record<string, never>, extra: RequestHandlerExtra) {
    const tenantId = requireTenantUserId(extra);
    const result = await this.rentals.listTenantRentals(tenantId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_rental_status",
    description: `Cek status satu sewa yang sudah dibuat.`,
    paramSchema: {
      rentalId: z.string().describe("ID sewa yang ingin dicek statusnya (gunakan Human ID seperti RNT-XXXX jika tersedia)"),
    },
  })
  async getRentalStatus(
    params: { rentalId: string },
    extra: RequestHandlerExtra,
  ) {
    const tenantId = requireTenantUserId(extra);
    const result = await this.rentals.getRentalStatus(params.rentalId, tenantId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "cancel_rental",
    description: `Batalkan sewa aktif yang baru dibuat.`,
    paramSchema: {
      rentalId: z.string().describe("ID sewa yang akan dibatalkan (gunakan Human ID seperti RNT-XXXX jika tersedia)"),
    },
  })
  async cancelRental(
    params: { rentalId: string },
    extra: RequestHandlerExtra,
  ) {
    const tenantId = requireTenantUserId(extra);
    const result = await this.rentals.cancelRental(params.rentalId, tenantId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "end_rental",
    description: `Akhiri sewa aktif milik tenant.

Gunakan tool ini untuk checkout, berhenti sewa, pindah kamar, atau membatalkan sewa aktif secara aman.
Jika sewa sudah punya pembayaran lunas, status sewa akan menjadi checked_out.
Jika belum ada pembayaran lunas, status sewa akan menjadi cancelled.
Tagihan pending/overdue yang belum lunas akan otomatis dibatalkan.`,
    paramSchema: {
      rentalId: z.string().describe("ID sewa aktif yang akan diakhiri (gunakan Human ID seperti RNT-XXXX)"),
      checkoutDate: z
        .string()
        .optional()
        .describe("Tanggal keluar/akhir sewa, format YYYY-MM-DD. Jika kosong, sistem memakai tanggal hari ini."),
    },
  })
  async endRental(
    params: { rentalId: string; checkoutDate?: string },
    extra: RequestHandlerExtra,
  ) {
    const tenantId = requireTenantUserId(extra);
    const result = await this.rentals.endRental(
      params.rentalId,
      tenantId,
      params.checkoutDate,
    );
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
