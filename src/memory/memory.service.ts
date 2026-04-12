import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { generateEmbedding } from "./embeddings.util";

@Injectable()
export class MemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async searchLongTermMemory(userId: string, query?: string) {
    const safeQuery = query?.trim();

    if (safeQuery) {
      try {
        const queryEmbedding = await generateEmbedding(safeQuery);
        const embeddingVector = `[${queryEmbedding.join(",")}]`;

        const rows = await this.prisma.$queryRaw<Array<{
          content: string;
          memory_type: string;
          category: string;
          canonical_key: string | null;
          importance_score: number | null;
          last_confirmed_at: Date | null;
          similarity: number;
        }>>`
          SELECT content, memory_type, category, canonical_key, importance_score, last_confirmed_at,
                 (1 - (embedding <=> ${embeddingVector}::vector)) as similarity
          FROM long_term_memory
          WHERE user_id = ${userId}
            AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY similarity DESC, importance_score DESC NULLS LAST
          LIMIT 8
        `;

        return {
          query: safeQuery,
          searchMode: "semantic",
          count: rows.length,
          memories: rows.map((row) => ({
            content: row.content,
            memoryType: row.memory_type,
            category: row.category,
            canonicalKey: row.canonical_key,
            importanceScore: row.importance_score,
            lastConfirmedAt: row.last_confirmed_at,
            similarity: row.similarity,
          })),
        };
      } catch (error) {
        // Fallback to keyword if embedding fails
        const rows = await this.prisma.$queryRaw<Array<{
          content: string;
          memory_type: string;
          category: string;
          canonical_key: string | null;
          importance_score: number | null;
          last_confirmed_at: Date | null;
        }>>`
          SELECT content, memory_type, category, canonical_key, importance_score, last_confirmed_at
          FROM long_term_memory
          WHERE user_id = ${userId}
            AND (expires_at IS NULL OR expires_at > NOW())
            AND content ILIKE ${`%${safeQuery}%`}
          ORDER BY importance_score DESC NULLS LAST, last_confirmed_at DESC NULLS LAST
          LIMIT 8
        `;

        return {
          query: safeQuery,
          searchMode: "keyword_fallback",
          count: rows.length,
          memories: rows.map((row) => ({
            content: row.content,
            memoryType: row.memory_type,
            category: row.category,
            canonicalKey: row.canonical_key,
            importanceScore: row.importance_score,
            lastConfirmedAt: row.last_confirmed_at,
          })),
        };
      }
    }

    const rows = await this.prisma.$queryRaw<Array<{
      content: string;
      memory_type: string;
      category: string;
      canonical_key: string | null;
      importance_score: number | null;
      last_confirmed_at: Date | null;
    }>>`
      SELECT content, memory_type, category, canonical_key, importance_score, last_confirmed_at
      FROM long_term_memory
      WHERE user_id = ${userId}
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY importance_score DESC NULLS LAST, last_confirmed_at DESC NULLS LAST
      LIMIT 8
    `;

    return {
      query: null,
      count: rows.length,
      memories: rows.map((row) => ({
        content: row.content,
        memoryType: row.memory_type,
        category: row.category,
        canonicalKey: row.canonical_key,
        importanceScore: row.importance_score,
        lastConfirmedAt: row.last_confirmed_at,
      })),
    };
  }
}
