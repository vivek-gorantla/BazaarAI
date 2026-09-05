import { Request, Response, NextFunction } from "express";
import { auditLogger } from "../lib/kafka-audit.js";

/**
 * Middleware to log system events (API requests/responses) to Kafka.
 */
export function systemAuditMiddleware(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Attach listener to response finish event to log the completed request
    res.on("finish", () => {
        const durationMs = Date.now() - startTime;
        
        // Extract useful metadata
        const metadata = {
            ip: req.ip,
            method: req.method,
            path: req.originalUrl || req.url,
            // Assuming user ID might be on req.user or similar if authenticated
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            userId: (req as any).user?.id || (req as any).body?.userId || (req as any).query?.userId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            merchantId: (req as any).merchant?.id || (req as any).body?.merchantId || (req as any).query?.merchantId,
        };

        const payload = {
            statusCode: res.statusCode,
            durationMs,
            userAgent: req.get("user-agent"),
        };

        auditLogger.logSystemEvent("API_REQUEST", payload, metadata);
    });

    next();
}
