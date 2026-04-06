import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentStatus } from "@prisma/client";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { room: true },
    });

    const externalId = uuidv4();

    // TODO: Integrate dengan bayar.gg API
    // const { data } = await axios.post(`${process.env.BAYARGG_BASE_URL}/payments`, {
    //   amount: booking.room.price,
    //   external_id: externalId,
    //   ...
    // }, { headers: { Authorization: `Bearer ${process.env.BAYARGG_API_KEY}` } });

    const paymentUrl = `https://bayar.gg/pay/${externalId}`; // placeholder

    return this.prisma.payment.create({
      data: {
        bookingId,
        amount: booking.room.price,
        status: PaymentStatus.pending,
        paymentUrl,
        externalId,
      },
    });
  }

  async getPaymentStatus(paymentId: string) {
    return this.prisma.payment.findUnique({ where: { id: paymentId } });
  }

  async getPaymentHistory(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { booking: { tenantId } },
      include: { booking: { include: { room: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { payments, total: payments.length };
  }

  async getPaymentReport(ownerId: string, month?: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.paid,
        booking: { room: { kosan: { ownerId } } },
        ...(month && {
          paidAt: {
            gte: new Date(`${month}-01`),
            lt: new Date(`${month}-01`),
          },
        }),
      },
      include: { booking: { include: { room: true, tenant: true } } },
    });
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    return { payments, totalAmount, count: payments.length };
  }

  async handleWebhook(externalId: string) {
    return this.prisma.payment.update({
      where: { externalId },
      data: { status: PaymentStatus.paid, paidAt: new Date() },
    });
  }
}
