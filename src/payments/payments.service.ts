import { Injectable } from "@nestjs/common";
import { PaymentStatus, RentalStatus } from "@prisma/client";
import { generateHumanId, normalizeId } from "../common/utils/id.util";
import { PrismaService } from "../prisma/prisma.service";
import { addDaysUtc, getNextPeriodStartUtc, getPeriodEndUtc, toDateOnlyIso } from "../lib/billing";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly paymentInclude = {
    images: true,
    rental: {
      include: {
        room: {
          include: {
            kosan: true,
          },
        },
      },
    },
  } as const;

  private mapRentalSummary(rental: any) {
    return {
      humanId: rental.humanId,
      status: rental.status,
      startDate: rental.startDate,
      paidUntil: rental.paidUntil,
      checkoutDate: rental.checkoutDate,
      monthlyPriceSnapshot: rental.monthlyPriceSnapshot,
      room: rental.room
        ? {
            humanId: rental.room.humanId,
            name: rental.room.name,
            monthlyPrice: rental.room.monthlyPrice,
            kosan: rental.room.kosan
              ? {
                  humanId: rental.room.kosan.humanId,
                  name: rental.room.kosan.name,
                  address: rental.room.kosan.address,
                }
              : null,
          }
        : null,
    };
  }

  private mapPayment(payment: any) {
    return {
      humanId: payment.humanId,
      monthsPaid: payment.monthsPaid,
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
      amount: payment.amount,
      paidAt: payment.paidAt,
      status: payment.status,
      note: payment.note,
      imageUrls: payment.images?.map((image: any) => image.url) ?? [],
      rental: payment.rental ? this.mapRentalSummary(payment.rental) : null,
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

  private async resolveRentalId(rentalId: string) {
    const normalizedId = normalizeId(rentalId);
    if (!normalizedId.startsWith("RNT-")) {
      return normalizedId;
    }

    const rental = await this.prisma.rental.findUnique({
      where: { humanId: normalizedId },
      select: { id: true },
    });

    return rental?.id || normalizedId;
  }

  private async getTargetRental(tenantId: string, rentalId?: string) {
    if (rentalId) {
      const resolvedRentalId = await this.resolveRentalId(rentalId);
      const rental = await this.prisma.rental.findFirst({
        where: { id: resolvedRentalId, tenantId },
        include: {
          room: {
            include: {
              kosan: true,
            },
          },
        },
      });

      if (!rental) {
        throw new Error("Sewa tidak ditemukan atau bukan milik Anda.");
      }

      return rental;
    }

    const rentals = await this.prisma.rental.findMany({
      where: {
        tenantId,
        status: RentalStatus.active,
      },
      include: {
        room: {
          include: {
            kosan: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 2,
    });

    if (rentals.length === 0) {
      throw new Error("Anda belum memiliki sewa aktif.");
    }

    if (rentals.length > 1) {
      throw new Error("Anda punya lebih dari satu sewa aktif. Sebutkan ID sewa yang ingin dibayar.");
    }

    return rentals[0];
  }

  private async getExistingUnpaidPayment(rentalId: string) {
    return this.prisma.payment.findFirst({
      where: {
        rentalId,
        status: {
          in: [PaymentStatus.pending, PaymentStatus.overdue],
        },
      },
      include: this.paymentInclude,
      orderBy: [{ periodStart: "asc" }, { createdAt: "asc" }],
    });
  }

  private buildNextPaymentPreview(rental: any, monthsPaid = 1) {
    const periodStart = getNextPeriodStartUtc(rental.startDate, rental.paidUntil);
    const periodEnd = getPeriodEndUtc(periodStart, monthsPaid);

    return {
      rentalId: rental.humanId,
      monthsPaid,
      periodStart,
      periodEnd,
      amount: rental.monthlyPriceSnapshot * monthsPaid,
      label: `${toDateOnlyIso(periodStart)} s/d ${toDateOnlyIso(periodEnd)}`,
    };
  }

  async createPayment(data: { tenantId: string; monthsPaid: number; rentalId?: string }) {
    if (!Number.isInteger(data.monthsPaid) || data.monthsPaid <= 0) {
      throw new Error("Jumlah bulan yang dibayar harus minimal 1.");
    }

    const rental = await this.getTargetRental(data.tenantId, data.rentalId);

    if (rental.status !== RentalStatus.active) {
      throw new Error("Hanya sewa aktif yang bisa dibayarkan.");
    }

    const existingUnpaid = await this.getExistingUnpaidPayment(rental.id);

    if (existingUnpaid) {
      const statusLabel =
        existingUnpaid.status === PaymentStatus.overdue ? "terlambat" : "pending";

      return {
        message: `Masih ada tagihan ${statusLabel} ${existingUnpaid.humanId}. Selesaikan atau upload bukti bayar untuk tagihan itu dulu ya.`,
        payment: this.mapPayment(existingUnpaid),
        reusedExisting: true,
      };
    }

    const preview = this.buildNextPaymentPreview(rental, data.monthsPaid);
    const payment = await this.prisma.payment.create({
      data: {
        humanId: generateHumanId("PYM"),
        rentalId: rental.id,
        monthsPaid: data.monthsPaid,
        periodStart: preview.periodStart,
        periodEnd: preview.periodEnd,
        amount: preview.amount,
        status: PaymentStatus.pending,
        note: `Tagihan ${data.monthsPaid} bulan untuk periode ${preview.label}.`,
      },
      include: this.paymentInclude,
    });

    return {
      message: `Tagihan ${payment.humanId} berhasil dibuat untuk periode ${preview.label} dengan total Rp ${payment.amount.toLocaleString("id-ID")}.`,
      payment: this.mapPayment(payment),
    };
  }

  async getPendingPayments(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        rental: { is: { tenantId } },
        status: {
          in: [PaymentStatus.pending, PaymentStatus.overdue],
        },
      },
      include: this.paymentInclude,
      orderBy: [{ periodStart: "asc" }, { createdAt: "asc" }],
    });

    let activeRental = null;
    let nextPaymentPreview = null;

    try {
      activeRental = await this.getTargetRental(tenantId);
      const existingUnpaid = activeRental ? await this.getExistingUnpaidPayment(activeRental.id) : null;
      nextPaymentPreview = existingUnpaid ? null : this.buildNextPaymentPreview(activeRental);
    } catch {
      activeRental = null;
      nextPaymentPreview = null;
    }

    return {
      payments: payments.map((payment) => this.mapPayment(payment)),
      total: payments.length,
      activeRental: activeRental ? this.mapRentalSummary(activeRental) : null,
      nextPaymentPreview,
    };
  }

  async getPaymentHistory(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { rental: { is: { tenantId } } },
      include: this.paymentInclude,
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });

    return {
      payments: payments.map((payment) => this.mapPayment(payment)),
      total: payments.length,
    };
  }

  async getPaymentStatus(paymentId: string, tenantId: string) {
    const resolvedPaymentId = await this.resolvePaymentId(paymentId);

    const payment = await this.prisma.payment.findFirst({
      where: { id: resolvedPaymentId, rental: { is: { tenantId } } },
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
      where: { id: resolvedPaymentId, rental: { is: { tenantId } } },
    });

    if (!payment) {
      throw new Error("Tagihan tidak ditemukan atau bukan milik Anda.");
    }

    let finalUrl = imageUrl;
    if (imageUrl.includes("/temp/")) {
      try {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const root = path.join(process.cwd(), "..");
        const oldFullPath = path.join(root, "skripsi-web", "public", imageUrl);

        const newRelativeUrl = imageUrl.replace("/temp/", "/payments/");
        const newFullPath = path.join(root, "skripsi-web", "public", newRelativeUrl);

        const targetDir = path.dirname(newFullPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        if (fs.existsSync(oldFullPath)) {
          fs.renameSync(oldFullPath, newFullPath);
          finalUrl = newRelativeUrl;
        }
      } catch (err) {
        console.error("Failed to move payment proof from temp:", err);
      }
    }

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

  async syncRentalPaidUntil(rentalId: string) {
    const paidPayments = await this.prisma.payment.findMany({
      where: {
        rentalId,
        status: PaymentStatus.paid,
      },
      select: {
        periodEnd: true,
      },
      orderBy: [{ periodEnd: "desc" }],
    });

    const paidUntil = paidPayments[0]?.periodEnd ?? null;
    await this.prisma.rental.update({
      where: { id: rentalId },
      data: {
        paidUntil,
        checkoutDate: paidUntil ? null : undefined,
      },
    });

    return paidUntil;
  }

  async handleWebhook(_externalId: string) {
    return { received: true, ignored: true };
  }
}
