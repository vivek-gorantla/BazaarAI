import { Router } from "express";
import { auditLogger } from "../lib/kafka-audit.js";

const router = Router();

router.get("/stream", (req, res) => {
    // Determine which topic to tail (default to agent-logs)
    const topic = (req.query.topic as string) || "agent-logs";
    
    // Set up Server-Sent Events headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Create a unique consumer group for this streaming client so they get all new messages independently
    const groupId = `audit-stream-${topic}-${Date.now()}`;
    const consumer = auditLogger.createConsumer(groupId);

    const startConsumer = async () => {
        try {
            await consumer.connect();
            await consumer.subscribe({ topic, fromBeginning: true });

            await consumer.run({
                eachMessage: async ({ message }) => {
                    const value = message.value?.toString();
                    if (value) {
                        res.write(`data: ${value}\n\n`);
                    }
                },
            });
        } catch (error) {
            console.error(`[AuditStream] Error starting consumer for topic ${topic}:`, error);
            res.write(`event: error\ndata: ${JSON.stringify({ error: "Stream error" })}\n\n`);
        }
    };

    startConsumer();

    // Cleanup when client disconnects
    req.on("close", async () => {
        try {
            await consumer.disconnect();
        } catch (err) {
            console.error("[AuditStream] Error disconnecting consumer:", err);
        }
        res.end();
    });
});

export default router;
