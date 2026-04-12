import { Injectable } from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly paymentInclude = {
    booking: {
      include: {
        tenant: true,
        room: {
          include: {
            kosan: true,
          },
        },
      },
    },
  } as const;

  async getPendingPayments(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        booking: { tenantId },
        status: PaymentStatus.pending,
      },
      include: this.paymentInclude,
      orderBy: { dueDate: "asc" },
    });

    return { payments, total: payments.length };
  }

  async getPaymentHistory(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { booking: { tenantId } },
      include: this.paymentInclude,
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    });

    return { payments, total: payments.length };
  }

  async getPaymentStatus(paymentId: string, tenantId: string) {
    return this.prisma.payment.findFirst({
      where: { id: paymentId, booking: { tenantId } },
      include: this.paymentInclude,
    });
  }

  async payInvoice(paymentId: string, tenantId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, booking: { tenantId } },
      include: this.paymentInclude,
    });

    if (!payment) {
      throw new Error("Tagihan tidak ditemukan untuk tenant ini");
    }

    if (payment.status === PaymentStatus.paid) {
      throw new Error("Tagihan ini sudah dibayar");
    }

    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      dueDate: payment.dueDate,
      roomName: payment.booking.room.name,
      kosanName: payment.booking.room.kosan.name,
      instructions:
        "Pembayaran dicatat manual dari web admin. Silakan hubungi pengelola kos, lalu tunggu verifikasi pembayaran di dashboard admin.",
    };
  }

  async handleWebhook(_externalId: string) {
    return { received: true, ignored: true };
  }
}
