import { Injectable } from "@nestjs/common";
import { RequestHandlerExtra, Resolver, Tool } from "@nestjs-mcp/server";
import { z } from "zod";
import { requireTenantUserId } from "../../auth/mcp-auth";
import { UsersService } from "../../users/users.service";

@Resolver()
@Injectable()
export class ProfileTools {
  constructor(private readonly users: UsersService) {}

  @Tool({
    name: "get_profile",
    description: `Lihat profil penyewa yang sedang login.`,
    paramSchema: {}
  })
  async getProfile(_params: Record<string, never>, extra: RequestHandlerExtra) {
    const userId = requireTenantUserId(extra);
    const result = await this.users.getProfile(userId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  @Tool({
    name: "update_profile",
    description: `Update profil penyewa (nama/HP).`,
    paramSchema: {
      name: z.string().nullable().optional().describe("Nama baru"),
      phone: z.string().nullable().optional().describe("Nomor telepon baru"),
    },
  })
  async updateProfile(params: {
    name?: string | null;
    phone?: string | null;
  }, extra: RequestHandlerExtra) {
    const userId = requireTenantUserId(extra);
    const result = await this.users.updateProfile(userId, {
      name: params.name ?? undefined,
      phone: params.phone ?? undefined,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
