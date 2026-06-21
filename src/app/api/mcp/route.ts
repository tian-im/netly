import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createHash } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { McpToken } from "@prisma/client";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getClientIp, checkPayloadSize } from "@/lib/request-utils";

import { registerTransactionTools } from "@/mcp-server/tools/transactions";
import { registerCategoryTools } from "@/mcp-server/tools/categories";
import { registerAccountTools } from "@/mcp-server/tools/accounts";
import { registerReportTools } from "@/mcp-server/tools/reports";
import { registerAnalysisTools } from "@/mcp-server/tools/analysis";

export const runtime = "nodejs";

// Custom WebSSETransport implementing the MCP SDK Transport interface
class WebSSETransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: any) => void;

  private controller?: ReadableStreamDefaultController;

  constructor(public sessionId: string) {}

  async start(): Promise<void> {
    // No-op connection setup for Transport interface
  }

  startStream(controller: ReadableStreamDefaultController) {
    this.controller = controller;
    // Send session ID endpoint redirection info as required by the SSE protocol
    this.sendEvent("endpoint", `/api/mcp?sessionId=${this.sessionId}`);
  }

  private sendEvent(event: string, data: string) {
    if (!this.controller) return;
    try {
      this.controller.enqueue(
        new TextEncoder().encode(`event: ${event}\ndata: ${data}\n\n`)
      );
    } catch (e) {
      this.close();
    }
  }

  async send(message: any): Promise<void> {
    this.sendEvent("message", JSON.stringify(message));
  }

  async close(): Promise<void> {
    if (this.controller) {
      try {
        this.controller.close();
      } catch (e) {}
      this.controller = undefined;
    }
    if (this.onclose) {
      this.onclose();
    }
  }
}

declare global {
  var __activeMcpSessions: Map<string, WebSSETransport> | undefined;
}

// Global active sessions map, persisted across HMR in dev
const activeSessions = globalThis.__activeMcpSessions ?? new Map<string, WebSSETransport>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__activeMcpSessions = activeSessions;
}

function createMcpServer(): McpServer {
  const mcpServer = new McpServer({
    name: "netly-ledger",
    version: "1.0.0",
  });

  registerTransactionTools(mcpServer);
  registerCategoryTools(mcpServer);
  registerAccountTools(mcpServer);
  registerReportTools(mcpServer);
  registerAnalysisTools(mcpServer);

  return mcpServer;
}

// Shared authentication helper
async function validateAuth(request: NextRequest): Promise<McpToken | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  const hashedToken = createHash("sha256").update(token).digest("hex");

  const mcpToken = await db.mcpToken.findUnique({
    where: { token: hashedToken },
  });

  if (!mcpToken) {
    return null;
  }

  // Update lastUsedAt metadata asynchronously (non-blocking — auth latency
  // should not depend on a metadata write). Errors are logged but do not
  // propagate; a stale lastUsedAt is acceptable.
  db.mcpToken.update({
    where: { id: mcpToken.id },
    data: { lastUsedAt: new Date() },
  }).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error updating token lastUsedAt:", message);
  });

  return mcpToken;
}

// GET /api/mcp - Establish SSE Connection
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`mcp-api-get:${ip}`, 60, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const mcpToken = await validateAuth(request);
  if (!mcpToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sessionId = crypto.randomUUID();
  const transport = new WebSSETransport(sessionId);
  activeSessions.set(sessionId, transport);

  const mcpServer = createMcpServer();
  mcpServer.connect(transport).catch((err) => {
    console.error(`MCP connection error for session ${sessionId}:`, err);
  });

  const stream = new ReadableStream({
    start(controller) {
      transport.startStream(controller);

      // Heartbeat ping every 30 seconds to keep connection alive
      const intervalId = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": ping\n\n"));
        } catch (e) {
          clearInterval(intervalId);
          transport.close();
          activeSessions.delete(sessionId);
        }
      }, 30000);

      transport.onclose = () => {
        clearInterval(intervalId);
        activeSessions.delete(sessionId);
      };
    },
    cancel() {
      transport.close();
      activeSessions.delete(sessionId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// POST /api/mcp?sessionId=... - Receive client JSON-RPC requests
export async function POST(request: NextRequest) {
  if (!checkPayloadSize(request, 1024 * 1024)) { // 1MB limit
    return new Response("Payload Too Large", { status: 413 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(`mcp-api-post:${ip}`, 200, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const mcpToken = await validateAuth(request);
  if (!mcpToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  const transport = activeSessions.get(sessionId);
  if (!transport) {
    return new Response("Session not found", { status: 404 });
  }

  try {
    const message = await request.json();
    if (transport.onmessage) {
      transport.onmessage(message);
    }
    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("Error processing POST message:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
