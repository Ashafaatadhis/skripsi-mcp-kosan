import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ComplaintStatus } from "@prisma/client";

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitComplaint(data: {
    roomId: string;
    tenantId: string;
    description: string;
    photoUrl?: string;
  }) {
    return this.prisma.complaint.create({ data });
  }

  async getComplaintStatus(complaintId: string) {
    return this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { room: true },
    });
  }

  async listComplaints(ownerId: string, status?: ComplaintStatus) {
    const complaints = await this.prisma.complaint.findMany({
      where: {
        room: { kosan: { ownerId } },
        ...(status && { status }),
      },
      include: { room: true, tenant: true },
      orderBy: { createdAt: "desc" },
    });
    return { complaints, total: complaints.length };
  }

  async resolveComplaint(complaintId: string, resolution: string) {
    return this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: ComplaintStatus.resolved,
        resolution,
        resolvedAt: new Date(),
      },
    });
  }
}
