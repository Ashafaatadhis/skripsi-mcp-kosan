import { Injectable } from "@nestjs/common";
import { Resolver, Tool } from "@nestjs-mcp/server";
import { z } from "zod";
import { MemoryService } from "../../memory/memory.service";

@Resolver()
@Injectable()
export class MemoryTools {
  constructor(private readonly memory: MemoryService) {}

  @Tool({
    name: "search_long_term_memory",
    description: `Cari ingatan jangka panjang tentang user yang sedang login.`,
    paramSchema: {
      userId: z.string().nullable().optional(),
      query: z.string().nullable().optional().describe("Kata kunci memory yang dicari"),
    },
  })
  async searchLongTermMemory(params: { userId: string | null; query?: string | null }) {
    const result = await this.memory.searchLongTermMemory(
      params.userId!,
      params.query ?? undefined,
    );
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
}
