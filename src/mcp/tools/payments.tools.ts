import { Injectable } from "@nestjs/common";
import { RequestHandlerExtra, Resolver, Tool } from "@nestjs-mcp/server";
import { z } from "zod";
import { requireTenantUserId } from "../../auth/mcp-auth";
import { PaymentsService } from "../../payments/payments.service";

@Resolver()
@Injectable()
export class PaymentsTools {
  constructor(private readonly payments: PaymentsService) {}

  @Tool({
    name: "create_payment",
    description: `Buat tagihan pembayaran baru untuk sewa aktif tenant.

Gunakan tool ini ketika user sudah jelas ingin membayar dan jumlah bulannya sudah diketahui.
Jika tenant hanya punya satu sewa aktif, rentalId boleh dikosongkan.`,
    paramSchema: {
      monthsPaid: z.number().min(1).describe("Jumlah bulan yang ingin dibayar (minimal 1)"),
      rentalId: z.string().optional().describe("ID sewa aktif jika user punya lebih dari satu sewa aktif"),
    },
  })
  async createPayment(
    params: { monthsPaid: number; rentalId?: string },
    extra: RequestHandlerExtra,
  ) {
    const userId = requireTenantUserId(extra);
    const result = await this.payments.createPayment({
      tenantId: userId,
      monthsPaid: params.monthsPaid,
      rentalId: params.rentalId,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_pending_payments",
    description: `Lihat tagihan pembayaran tenant yang belum dibayar, beserta preview tagihan periode berikutnya jika belum ada tagihan pending.`,
    paramSchema: {}
  })
  async getPendingPayments(
    _params: Record<string, never>,
    extra: RequestHandlerExtra,
  ) {
    const userId = requireTenantUserId(extra);
    const result = await this.payments.getPendingPayments(userId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_payment_status",
    description: `Cek status satu pembayaran.`,
    paramSchema: {
      paymentId: z.string().describe("ID pembayaran yang ingin dicek (gunakan Human ID seperti PYM-XXXX jika tersedia)"),
    },
  })
  async getPaymentStatus(
    params: { paymentId: string },
    extra: RequestHandlerExtra,
  ) {
    const userId = requireTenantUserId(extra);
    const result = await this.payments.getPaymentStatus(params.paymentId, userId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_payment_history",
    description: `Lihat riwayat semua pembayaran tenant.`,
    paramSchema: {}
  })
  async getPaymentHistory(
    _params: Record<string, never>,
    extra: RequestHandlerExtra,
  ) {
    const userId = requireTenantUserId(extra);
    const result = await this.payments.getPaymentHistory(userId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "upload_payment_proof",
    description: `Unggah bukti bayar (foto struk/transfer) untuk tagihan tertentu. PENTING: Gunakan tool ini HANYA setelah user mengirim foto bukti bayar. Fokus pilih paymentId yang benar dari hasil get_pending_payments. imageUrl akan diisi otomatis oleh sistem bot dari foto yang baru dikirim user.`,
    paramSchema: {
      paymentId: z.string().describe("ID tagihan target (gunakan Human ID seperti PYM-XXXX dari hasil get_pending_payments)"),
      imageUrl: z.string().optional().describe("Diisi otomatis oleh sistem dari foto user; tidak perlu ditebak manual"),
    },
  })
  async uploadPaymentProof(
    params: { paymentId: string; imageUrl: string },
    extra: RequestHandlerExtra,
  ) {
    const userId = requireTenantUserId(extra);
    const result = await this.payments.uploadPaymentProof(
      params.paymentId,
      userId,
      params.imageUrl,
    );
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
