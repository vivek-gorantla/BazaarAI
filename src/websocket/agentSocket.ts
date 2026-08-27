import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { prisma } from "../lib/prisma.js";
import { extractFieldFills } from "../agents/onboardingAgent.js";
import type {
    ClientToAgentMessage,
    AgentToClientMessage,
    FillRequestMessage,
} from "../agents/types.js";

function send(ws: WebSocket, msg: AgentToClientMessage) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}

/**
 * Authenticates the WebSocket connection via the `token` query param
 * (which holds the merchant's user ID — same as the x-user-id header).
 */
async function authenticate(request: IncomingMessage): Promise<string | null> {
    try {
        const url = new URL(request.url ?? "/", "http://localhost");
        const token = url.searchParams.get("token");
        if (!token) return null;

        const user = await prisma.user.findUnique({
            where: { id: token },
            select: { id: true, role: true },
        });

        if (!user || user.role !== "merchant") return null;
        return user.id;
    } catch {
        return null;
    }
}

async function handleFillRequest(ws: WebSocket, message: FillRequestMessage) {
    const { transcription, uiContext } = message;

    if (!transcription?.trim()) {
        send(ws, { type: "error", message: "No transcription provided" });
        return;
    }

    if (!uiContext?.fields?.length) {
        send(ws, { type: "error", message: "No form fields provided in UI context" });
        return;
    }

    console.log(`[AgentSocket] fill_request for page: ${uiContext.pageId}, transcription length: ${transcription.length}`);

    // Call GPT-5.1 agent
    const fills = await extractFieldFills(transcription, uiContext);

    if (fills.length === 0) {
        send(ws, {
            type: "done",
            summary: "No matching fields found in your speech. Please try again with more detail.",
            filledCount: 0,
        });
        return;
    }

    // Stream fills back to frontend one by one with a small delay for UX animation
    for (const fill of fills) {
        send(ws, { type: "field_fill", fieldId: fill.fieldId, value: fill.value });
        // Small delay so frontend can animate each field fill sequentially
        await new Promise((r) => setTimeout(r, 120));
    }

    send(ws, {
        type: "done",
        summary: `Successfully filled ${fills.length} field${fills.length !== 1 ? "s" : ""}.`,
        filledCount: fills.length,
    });
}

export function attachWebSocketServer(httpServer: Server): WebSocketServer {
    const wss = new WebSocketServer({ noServer: true });

    // Handle the HTTP upgrade for the /ws/agent path
    httpServer.on("upgrade", async (request, socket, head) => {
        const url = new URL(request.url ?? "/", "http://localhost");

        if (url.pathname !== "/ws/agent") {
            socket.destroy();
            return;
        }

        const userId = await authenticate(request);
        if (!userId) {
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request, userId);
        });
    });

    wss.on("connection", (ws: WebSocket, _req: IncomingMessage, userId: string) => {
        console.log(`[AgentSocket] Client connected: ${userId}`);

        ws.on("message", async (raw) => {
            try {
                const message: ClientToAgentMessage = JSON.parse(raw.toString());

                switch (message.type) {
                    case "fill_request":
                        await handleFillRequest(ws, message);
                        break;
                    default:
                        send(ws, { type: "error", message: "Unknown message type" });
                }
            } catch (err) {
                console.error("[AgentSocket] Error handling message:", err);
                send(ws, {
                    type: "error",
                    message: err instanceof Error ? err.message : "An unexpected error occurred",
                });
            }
        });

        ws.on("close", () => {
            console.log(`[AgentSocket] Client disconnected: ${userId}`);
        });

        ws.on("error", (err) => {
            console.error(`[AgentSocket] WebSocket error for ${userId}:`, err);
        });
    });

    console.log("[AgentSocket] WebSocket server attached at /ws/agent");
    return wss;
}
