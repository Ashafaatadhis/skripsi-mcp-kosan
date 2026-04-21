import { Injectable } from "@nestjs/common";
import { PaymentStatus, RentalStatus } from "@prisma/client";
import { generateHumanId, normalizeId } from "../common/utils/id.util";
import { PrismaService } from "../prisma/prisma.service";
import { toDateOnlyIso } from "../lib/billing";

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  private getRentalInclude() {
    return {
      room: {
        include: {
          images: true,
          kosan: {
            include: {
              images: true,
            },
          },
        },
      },
      payments: {
        orderBy: [{ periodStart: "asc" as const }, { createdAt: "asc" as const }],
      },
    };
  }

  private mapPaymentSummary(payment: any) {
    return {
      humanId: payment.humanId,
      monthsPaid: payment.monthsPaid,
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
      amount: payment.amount,
      paidAt: payment.paidAt,
      status: payment.status,
      note: payment.note,
    };
  }

  private mapRoomSummary(room: any) {
    return {
      humanId: room.humanId,
      name: room.name,
      monthlyPrice: room.monthlyPrice,
      imageUrls: room.images?.map((image: any) => image.url) ?? [],
      kosan: room.kosan
        ? {
            humanId: room.kosan.humanId,
            name: room.kosan.name,
            address: room.kosan.address,
            imageUrls: room.kosan.images?.map((image: any) => image.url) ?? [],
          }
        : null,
    };
  }

  private mapRental(rental: any) {
    return {
      humanId: rental.humanId,
      status: rental.status,
      startDate: rental.startDate,
      paidUntil: rental.paidUntil,
      checkoutDate: rental.checkoutDate,
      monthlyPriceSnapshot: rental.monthlyPriceSnapshot,
      note: rental.note,
      room: rental.room ? this.mapRoomSummary(rental.room) : null,
      payments: rental.payments?.map((payment: any) => this.mapPaymentSummary(payment)) ?? [],
    };
  }

  private async resolveToUuid(id: string, type: "room" | "rental" | "payment"): Promise<string> {
    if (!id) return id;

    if (!id.startsWith("RM-") && !id.startsWith("RNT-") && !id.startsWith("PYM-")) {
      return id;
    }

    if (type === "room" && id.startsWith("RM-")) {
      const room = await this.prisma.room.findUnique({
        where: { humanId: id },
        select: { id: true },
      });
      return room?.id || id;
    }

    if (type === "rental" && id.startsWith("RNT-")) {
      const rental = await this.prisma.rental.findUnique({
        where: { humanId: id },
        select: { id: true },
      });
      return rental?.id || id;
    }

    if (type === "payment" && id.startsWith("PYM-")) {
      const payment = await this.prisma.payment.findUnique({
        where: { humanId: id },
        select: { id: true },
      });
      return payment?.id || id;
    }

    return id;
  }

  async createRental(data: {
    roomId: string;
    tenantId: string;
    startDate: string;
  }) {
    const roomId = normalizeId(data.roomId);
    const tenantId = normalizeId(data.tenantId);
    const resolvedRoomId = await this.resolveToUuid(roomId, "room");

    const room = await this.prisma.room.findUnique({
      where: { id: resolvedRoomId },
      include: {
        rentals: {
          where: { status: RentalStatus.active },
          select: { id: true },
        },
      },
    });

    if (!room) {
      throw new Error("Kamar tidak ditemukan");
    }

    if (room.rentals.length >= room.quantity) {
      throw new Error("Kamar tidak tersedia");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      throw new Error("Tenant tidak ditemukan");
    }

    const startDate = new Date(data.startDate);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Tanggal mulai tidak valid");
    }

    const activeRental = await this.prisma.rental.findFirst({
      where: {
        tenantId,
        status: RentalStatus.active,
      },
      select: { humanId: true },
    });

    if (activeRental) {
      throw new Error(`Anda masih punya sewa aktif (${activeRental.humanId}). Selesaikan dulu sebelum pindah kamar.`);
    }

    const rental = await this.prisma.rental.create({
      data: {
        humanId: generateHumanId("RNT"),
        roomId: room.id,
        tenantId,
        startDate,
        monthlyPriceSnapshot: room.monthlyPrice,
        status: RentalStatus.active,
      },
      include: this.getRentalInclude(),
    });

    return this.mapRental(rental);
  }

  async listTenantRentals(tenantId: string) {
    const rentals = await this.prisma.rental.findMany({
      where: { tenantId },
      include: this.getRentalInclude(),
      orderBy: [{ createdAt: "desc" }],
    });

    return {
      rentals: rentals.map((rental) => this.mapRental(rental)),
      total: rentals.length,
    };
  }

  async getRentalStatus(rentalId: string, tenantId: string) {
    const resolvedRentalId = await this.resolveToUuid(normalizeId(rentalId), "rental");

    const rental = await this.prisma.rental.findFirst({
      where: { id: resolvedRentalId, tenantId },
      include: this.getRentalInclude(),
    });

    return rental ? this.mapRental(rental) : null;
  }

  async cancelRental(rentalId: string, tenantId: string) {
    const resolvedRentalId = await this.resolveToUuid(normalizeId(rentalId), "rental");

    const existingRental = await this.prisma.rental.findFirst({
      where: { id: resolvedRentalId, tenantId },
      select: {
        id: true,
        humanId: true,
        status: true,
        payments: {
          select: { id: true, status: true },
        },
      },
    });

    if (!existingRental) {
      throw new Error("Sewa tidak ditemukan untuk tenant ini");
    }

    if (existingRental.status !== RentalStatus.active) {
      throw new Error("Hanya sewa aktif yang bisa dibatalkan");
    }

    if (existingRental.payments.some((payment) => payment.status === PaymentStatus.paid)) {
      throw new Error("Sewa yang sudah memiliki pembayaran lunas tidak bisa dibatalkan lewat bot");
    }

    const unpaidPaymentIds = existingRental.payments
      .filter((payment) =>
        payment.status === PaymentStatus.pending || payment.status === PaymentStatus.overdue,
      )
      .map((payment) => payment.id);

    const [, updatedRental] = await this.prisma.$transaction([
      this.prisma.payment.updateMany({
        where: {
          id: {
            in: unpaidPaymentIds,
          },
        },
        data: {
          status: PaymentStatus.cancelled,
        },
      }),
      this.prisma.rental.update({
        where: { id: resolvedRentalId },
        data: { status: RentalStatus.cancelled },
        include: this.getRentalInclude(),
      }),
    ]);

    return {
      message: `Sewa ${updatedRental.humanId} berhasil dibatalkan.`,
      rental: this.mapRental(updatedRental),
      summary:
        unpaidPaymentIds.length > 0
          ? `Sewa aktif dibatalkan. ${unpaidPaymentIds.length} tagihan yang belum lunas juga otomatis dibatalkan. Tanggal mulai sebelumnya ${toDateOnlyIso(updatedRental.startDate)}.`
          : `Sewa aktif dibatalkan. Tanggal mulai sebelumnya ${toDateOnlyIso(updatedRental.startDate)}.`,
    };
  }

  async endRental(rentalId: string, tenantId: string, checkoutDate?: string) {
    const resolvedRentalId = await this.resolveToUuid(normalizeId(rentalId), "rental");

    const existingRental = await this.prisma.rental.findFirst({
      where: { id: resolvedRentalId, tenantId },
      select: {
        id: true,
        humanId: true,
        status: true,
        startDate: true,
        payments: {
          select: { id: true, status: true },
        },
      },
    });

    if (!existingRental) {
      throw new Error("Sewa tidak ditemukan untuk tenant ini");
    }

    if (existingRental.status !== RentalStatus.active) {
      throw new Error("Hanya sewa aktif yang bisa diakhiri");
    }

    const parsedCheckoutDate = checkoutDate ? new Date(checkoutDate) : new Date();
    if (Number.isNaN(parsedCheckoutDate.getTime())) {
      throw new Error("Tanggal keluar tidak valid");
    }

    const hasPaidPayment = existingRental.payments.some(
      (payment) => payment.status === PaymentStatus.paid,
    );
    const unpaidPaymentIds = existingRental.payments
      .filter((payment) =>
        payment.status === PaymentStatus.pending || payment.status === PaymentStatus.overdue,
      )
      .map((payment) => payment.id);
    const nextStatus = hasPaidPayment ? RentalStatus.checked_out : RentalStatus.cancelled;

    const [, updatedRental] = await this.prisma.$transaction([
      this.prisma.payment.updateMany({
        where: {
          id: {
            in: unpaidPaymentIds,
          },
        },
        data: {
          status: PaymentStatus.cancelled,
        },
      }),
      this.prisma.rental.update({
        where: { id: resolvedRentalId },
        data: {
          status: nextStatus,
          checkoutDate: parsedCheckoutDate,
        },
        include: this.getRentalInclude(),
      }),
    ]);

    const statusLabel = nextStatus === RentalStatus.checked_out ? "diakhiri" : "dibatalkan";

    return {
      message: `Sewa ${updatedRental.humanId} berhasil ${statusLabel}.`,
      rental: this.mapRental(updatedRental),
      summary:
        unpaidPaymentIds.length > 0
          ? `Sewa aktif ${statusLabel}. ${unpaidPaymentIds.length} tagihan yang belum lunas juga otomatis dibatalkan. Tanggal keluar ${toDateOnlyIso(updatedRental.checkoutDate)}.`
          : `Sewa aktif ${statusLabel}. Tanggal keluar ${toDateOnlyIso(updatedRental.checkoutDate)}.`,
    };
  }
}
