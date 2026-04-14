import { Injectable } from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import { normalizeId } from "../common/utils/id.util";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly paymentInclude = {
    images: true,
    booking: {
      include: {
        room: {
          include: {
            kosan: true,
          },
        },
      },
    },
  } as const;

  private mapPayment(payment: any) {
    return {
      humanId: payment.humanId,
      amount: payment.amount,
      dueDate: payment.dueDate,
      paidAt: payment.paidAt,
      status: payment.status,
      note: payment.note,
      imageUrls: payment.images?.map((image: any) => image.url) ?? [],
      booking: payment.booking
        ? {
            humanId: payment.booking.humanId,
            status: payment.booking.status,
            startDate: payment.booking.startDate,
            endDate: payment.booking.endDate,
            room: payment.booking.room
              ? {
                  humanId: payment.booking.room.humanId,
                  name: payment.booking.room.name,
                  monthlyPrice: payment.booking.room.monthlyPrice,
                  kosan: payment.booking.room.kosan
                    ? {
                        humanId: payment.booking.room.kosan.humanId,
                        name: payment.booking.room.kosan.name,
                        address: payment.booking.room.kosan.address,
                      }
                    : null,
                }
              : null,
          }
        : null,
    };
  }

  private async resolvePaymentId(paymentId: string) {
    const normalizedId = normalizeId(paymentId);
    if (!normalizedId.startsWith("PYM-")) {
      return normalizedId;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { humanId: normalizedId },
      select: { id: true },
    });

    return payment?.id || normalizedId;
  }

  private async resolveBookingId(bookingId: string) {
    const normalizedId = normalizeId(bookingId);
    if (!normalizedId.startsWith("BKG-")) {
      return normalizedId;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { humanId: normalizedId },
      select: { id: true },
    });

    return booking?.id || normalizedId;
  }

  async getPendingPayments(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        booking: { is: { tenantId } },
        status: PaymentStatus.pending,
      },
      include: this.paymentInclude,
      orderBy: { dueDate: "asc" },
    });

    return {
      payments: payments.map((payment) => this.mapPayment(payment)),
      total: payments.length,
    };
  }

  async getPaymentHistory(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { booking: { is: { tenantId } } },
      include: this.paymentInclude,
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    });

    return {
      payments: payments.map((payment) => this.mapPayment(payment)),
      total: payments.length,
    };
  }

  async getPaymentStatus(paymentId: string, tenantId: string) {
    const resolvedPaymentId = await this.resolvePaymentId(paymentId);

    const payment = await this.prisma.payment.findFirst({
      where: { id: resolvedPaymentId, booking: { is: { tenantId } } },
      include: this.paymentInclude,
    });

    return payment ? this.mapPayment(payment) : null;
  }

  async uploadPaymentProof(paymentId: string, tenantId: string, imageUrl: string) {
    const resolvedPaymentId = await this.resolvePaymentId(paymentId);

    if (!imageUrl) {
      throw new Error("URL bukti bayar tidak ditemukan.");
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: resolvedPaymentId, booking: { is: { tenantId } } },
    });

    if (!payment) {
      throw new Error("Tagihan tidak ditemukan atau bukan milik Anda.");
    }

    // LOGIKA CERDAS: Pindahkan file dari /temp/ ke /payments/ jika dikonfirmasi struk
    let finalUrl = imageUrl;
    if (imageUrl.includes("/temp/")) {
      try {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const root = path.join(process.cwd(), "..");
        const oldFullPath = path.join(root, "skripsi-web", "public", imageUrl);
        
        const newRelativeUrl = imageUrl.replace("/temp/", "/payments/");
        const newFullPath = path.join(root, "skripsi-web", "public", newRelativeUrl);

        // Pastikan folder tujuan ada
        const targetDir = path.dirname(newFullPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Pindahkan file jika ada
        if (fs.existsSync(oldFullPath)) {
          fs.renameSync(oldFullPath, newFullPath);
          finalUrl = newRelativeUrl;
        }
      } catch (err) {
        // Fallback jika gagal move, tetap simpan URL lama agar tidak error transaksional
        console.error("Failed to move payment proof from temp:", err);
      }
    }

    // Tambahkan gambar ke pembayaran
    const updatedPayment = await this.prisma.payment.update({
      where: { id: resolvedPaymentId },
      data: {
        images: {
          create: {
            url: finalUrl,
          },
        },
      },
      include: this.paymentInclude,
    });

    return {
      message: `Bukti bayar berhasil diunggah untuk tagihan ${updatedPayment.humanId}. Admin akan memverifikasi pembayaran Anda segera.`,
      payment: this.mapPayment(updatedPayment),
    };
  }

  async handleWebhook(_externalId: string) {
    return { received: true, ignored: true };
  }
}
