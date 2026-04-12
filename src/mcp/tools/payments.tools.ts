import { Injectable } from "@nestjs/common";
import { Resolver, Tool } from "@nestjs-mcp/server";
import { z } from "zod";
import { PaymentsService } from "../../payments/payments.service";

@Resolver()
@Injectable()
export class PaymentsTools {
  constructor(private readonly payments: PaymentsService) {}

  @Tool({
    name: "get_pending_payments",
    description: `Lihat tagihan pembayaran tenant yang belum dibayar.`,
    paramSchema: {
      userId: z.string().nullable().optional(),
    }
  })
  async getPendingPayments(params: { userId: string | null }) {
    const result = await this.payments.getPendingPayments(params.userId!);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "pay_invoice",
    description: `Minta instruksi pembayaran manual untuk sebuah tagihan.`,
    paramSchema: {
      userId: z.string().nullable().optional(),
      paymentId: z.string().describe("ID tagihan yang akan dibayar (WAJIB)"),
    },
  })
  async payInvoice(params: { userId: string | null; paymentId: string }) {
    const result = await this.payments.payInvoice(params.paymentId, params.userId!);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_payment_status",
    description: `Cek status satu pembayaran.`,
    paramSchema: {
      userId: z.string().nullable().optional(),
      paymentId: z.string().describe("ID pembayaran yang ingin dicek (WAJIB)"),
    },
  })
  async getPaymentStatus(params: { userId: string | null; paymentId: string }) {
    const result = await this.payments.getPaymentStatus(params.paymentId, params.userId!);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "get_payment_history",
    description: `Lihat riwayat semua pembayaran tenant.`,
    paramSchema: {
      userId: z.string().nullable().optional()
    }
  })
  async getPaymentHistory(params: { userId: string | null }) {
    const result = await this.payments.getPaymentHistory(params.userId!);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
