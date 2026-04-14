import { Inject, Injectable, Logger } from "@nestjs/common";
import { McpServerOptions, RegistryService, SessionManager } from "@nestjs-mcp/server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { Request, Response } from "express";

type SessionServer = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

type McpTransportOptions = {
  streamable?: {
    options?: {
      enableJsonResponse?: boolean;
      sessionIdGenerator?: () => string | undefined;
    };
  };
};

@Injectable()
export class CustomMcpService {
  private readonly logger = new Logger(CustomMcpService.name);
  private readonly sessionServers = new Map<string, SessionServer>();

  constructor(
    @Inject("MCP_SERVER_OPTIONS")
    private readonly options: McpServerOptions,
    @Inject("MCP_TRANSPORT_OPTIONS")
    private readonly transportOptions: McpTransportOptions,
    private readonly registry: RegistryService,
    private readonly sessionManager: SessionManager,
  ) {}

  private async createSessionServer(req: Request) {
    const server = new McpServer(this.options.serverInfo, this.options.options);
    await this.registry.registerAll(server);

    let initializedSessionId: string | undefined;
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () =>
        this.transportOptions?.streamable?.options?.sessionIdGenerator?.() ||
        randomUUID(),
      enableJsonResponse: this.transportOptions?.streamable?.options?.enableJsonResponse,
      onsessioninitialized: (sessionId) => {
        initializedSessionId = sessionId;
        this.sessionManager.setSession(sessionId, {
          transport,
          request: req,
        });
        this.sessionServers.set(sessionId, { server, transport });
      },
    });

    transport.onclose = () => {
      if (initializedSessionId) {
        this.sessionManager.deleteSession(initializedSessionId);
        this.sessionServers.delete(initializedSessionId);
      }

      void server.close().catch((error: unknown) => {
        this.logger.error(
          `Failed to close MCP server: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    };

    await server.connect(transport);
    return transport;
  }

  async handlePostRequest(req: Request, res: Response) {
    const sessionId = req.headers["mcp-session-id"];
    let transport: StreamableHTTPServerTransport;

    if (sessionId && typeof sessionId === "string") {
      const session = this.sessionManager.getSession(sessionId);

      if (!session) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
        return;
      }

      if (!(session.transport instanceof StreamableHTTPServerTransport)) {
        throw new Error("Invalid transport");
      }

      session.request = req;
      transport = session.transport;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = await this.createSessionServer(req);
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  }

  async handleGetRequest(req: Request, res: Response) {
    const sessionId = req.headers["mcp-session-id"];

    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const { transport } = session;
    if (!(transport instanceof StreamableHTTPServerTransport)) {
      throw new Error("Invalid transport");
    }

    session.request = req;
    await transport.handleRequest(req, res);
  }

  async handleDeleteRequest(req: Request, res: Response) {
    const sessionId = req.headers["mcp-session-id"];

    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).json({ error: "Missing sessionId" });
      return;
    }

    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Transport not found", sessionId });
      return;
    }

    const { transport } = session;
    if (!(transport instanceof StreamableHTTPServerTransport)) {
      throw new Error("Invalid transport");
    }

    await transport.close();
    this.sessionManager.deleteSession(sessionId);
    this.sessionServers.delete(sessionId);

    res.status(200).json({ success: true, sessionId });
  }
}
