import { createHmac, timingSafeEqual } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import { RequestHandlerExtra } from "@nestjs-mcp/server";

const BOT_SECRET_HEADER = "x-mcp-bot-secret";
const TENANT_CONTEXT_HEADER = "x-tenant-context";
const DEFAULT_SHARED_SECRET = "dev-mcp-shared-secret-change-me";

type TenantContextPayload = {
  userId: string;
};

const getSharedSecret = () =>
  process.env.MCP_SHARED_SECRET?.trim() || DEFAULT_SHARED_SECRET;

const sign = (value: string) =>
  createHmac("sha256", getSharedSecret()).update(value).digest("base64url");

const normalizeHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const BOT_AUTH_HEADERS = {
  botSecret: BOT_SECRET_HEADER,
  tenantContext: TENANT_CONTEXT_HEADER,
} as const;

export const hasValidBotSecret = (
  value: string | string[] | undefined,
): boolean => {
  const provided = normalizeHeaderValue(value);
  const expected = getSharedSecret();

  if (!provided || provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
};

const decodeTenantContext = (token: string): TenantContextPayload => {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    throw new UnauthorizedException("Tenant context token tidak valid.");
  }

  const expectedSignature = sign(encodedPayload);
  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    throw new UnauthorizedException("Tenant context signature tidak valid.");
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString(),
    ) as TenantContextPayload;

    if (!payload.userId?.trim()) {
      throw new UnauthorizedException("Tenant context tidak memiliki userId.");
    }

    return payload;
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }

    throw new UnauthorizedException("Tenant context tidak bisa dibaca.");
  }
};

export const requireTenantUserId = (extra: RequestHandlerExtra): string => {
  const token = normalizeHeaderValue(extra.headers?.[TENANT_CONTEXT_HEADER]);

  if (!token) {
    throw new UnauthorizedException("Tenant context wajib dikirim.");
  }

  return decodeTenantContext(token).userId;
};
