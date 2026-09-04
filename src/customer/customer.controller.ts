import { Request, Response } from "express";
import { CustomerService } from "./customer.service.js";
import { CustomerAgentOrchestrator } from "./agent.orchestrator.js";

class CustomerController {
    private service = new CustomerService();

    async chat(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.headers["x-user-id"] as string;
            const query = req.body.query;
            const history = req.body.history || [];
            
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Accel-Buffering", "no");
            res.flushHeaders();

            await CustomerAgentOrchestrator(userId, query, history, res);
        } catch (error: any) {
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: error.message });
            } else {
                res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
                res.end();
            }
        }
    }
}
export const customerController = new CustomerController();