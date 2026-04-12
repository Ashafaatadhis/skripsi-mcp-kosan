import { Injectable } from "@nestjs/common";
import { Resolver, Tool } from "@nestjs-mcp/server";
import { z } from "zod";
import { UsersService } from "../../users/users.service";

@Resolver()
@Injectable()
export class ProfileTools {
  constructor(private readonly users: UsersService) {}

  @Tool({
    name: "get_profile",
    description: `Lihat profil penyewa yang sedang login.`,
    paramSchema: {
      userId: z.string().nullable().optional(),
    }
  })
  async getProfile(params: { userId: string | null }) {
    const result = await this.users.getProfile(params.userId!);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "update_profile",
    description: `Update profil penyewa (nama/HP).`,
    paramSchema: {
      userId: z.string().nullable().optional(),
      name: z.string().nullable().optional().describe("Nama baru"),
      phone: z.string().nullable().optional().describe("Nomor telepon baru"),
    },
  })
  async updateProfile(params: {
    userId: string | null;
    name?: string | null;
    phone?: string | null;
  }) {
    const result = await this.users.updateProfile(params.userId!, {
      name: params.name ?? undefined,
      phone: params.phone ?? undefined,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
