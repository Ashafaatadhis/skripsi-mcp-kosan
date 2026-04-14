import { Injectable } from "@nestjs/common";
import { RequestHandlerExtra, Resolver, Tool } from "@nestjs-mcp/server";
import { z } from "zod";
import { requireTenantUserId } from "../../auth/mcp-auth";
import { MemoryService } from "../../memory/memory.service";

@Resolver()
@Injectable()
export class MemoryTools {
  constructor(private readonly memory: MemoryService) {}

  @Tool({
    name: "search_long_term_memory",
    description: `Cari ingatan jangka panjang tentang user yang sedang login.`,
    paramSchema: {
      query: z.string().nullable().optional().describe("Kata kunci memory yang dicari"),
    },
  })
  async searchLongTermMemory(
    params: { query?: string | null },
    extra: RequestHandlerExtra,
  ) {
    const userId = requireTenantUserId(extra);
    const result = await this.memory.searchLongTermMemory(
      userId,
      params.query ?? undefined,
    );
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
