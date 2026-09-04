import { Router, Request, Response } from "express";
import multer from "multer";
import { merchantOrchestrator } from "../agents/orchestrator.js";
import { productAgent } from "../agents/merchant-agents/product-agent/index.js";
import { inventoryAgent } from "../agents/merchant-agents/inventory-agent/index.js";
import { supplierAgent } from "../agents/merchant-agents/supplier-agent/index.js";
import { growthAgent } from "../agents/merchant-agents/growth-agent/index.js";
import { asyncHandler } from "../middleware/errors.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 }
});
const agentRouter = Router();

/**
 * Robustly extracts body data whether sent as JSON, multipart/form-data,
 * raw string, or text/plain in Postman.
 */
function parseRequestBody(req: Request): any {
    let body = req.body;
    if (!body) return {};

    if (Buffer.isBuffer(body)) {
        body = body.toString("utf-8");
    }

    if (typeof body === "string") {
        const trimmed = body.trim();
        if (!trimmed) return {};
        try {
            return JSON.parse(trimmed);
        } catch {
            try {
                if (!trimmed.startsWith("{") && trimmed.includes(":")) {
                    return JSON.parse(`{${trimmed}}`);
                }
            } catch {
                // Not valid JSON key-value
            }
            return { prompt: trimmed };
        }
    }

    return body;
}

/**
 * 1. Universal Merchant Agent Orchestrator Endpoint
 * POST /api/agent/process
 * Accepts JSON, multipart/form-data, or raw text in Postman
 */
agentRouter.post("/process", upload.single("file"), asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(req);
    const prompt = body.prompt || body.message || (typeof req.query.prompt === "string" ? req.query.prompt : "");
    const storeId = body.storeId || (typeof req.query.storeId === "string" ? req.query.storeId : undefined);
    const merchantId = body.merchantId || (typeof req.query.merchantId === "string" ? req.query.merchantId : undefined);
    const uploadType = body.uploadType || body.type || (typeof req.query.uploadType === "string" ? req.query.uploadType : undefined);
    const fileBuffer = req.file ? req.file.buffer : undefined;
    const imageUrl = body.imageUrl || body.image;
    const textData = body.textData || body.text;

    const historyRaw = body.history;
    let history: any[] = [];
    if (Array.isArray(historyRaw)) {
        history = historyRaw;
    } else if (typeof historyRaw === "string" && historyRaw.trim()) {
        try { history = JSON.parse(historyRaw); } catch {}
    }

    let fullPrompt = prompt;
    if (history.length > 0 && prompt) {
        const historyText = history.map((h: any) => `${h.role === 'user' || h.sender === 'user' ? 'Merchant' : 'Agent'}: ${h.content || h.text}`).join("\n");
        fullPrompt = `Previous Conversation History:\n${historyText}\n\nMerchant Current Input: ${prompt}`;
    }

    // Strict parameter isolation based on uploadType
    const isVoice = String(uploadType).toLowerCase() === "voice";
    const isImage = String(uploadType).toLowerCase() === "image";

    const result = await merchantOrchestrator.process({
        prompt: fullPrompt,
        storeId,
        merchantId,
        uploadType,
        fileBuffer,
        fileUrl: !isVoice && typeof imageUrl === "string" ? imageUrl : undefined,
        textData: typeof textData === "string" ? textData : undefined,
        targetAgent: body.targetAgent || (typeof req.query.targetAgent === "string" ? req.query.targetAgent : undefined),
    });

    res.status(result.success ? 200 : 400).json(result);
}));

/**
 * 2. Product Agent Direct Endpoint
 * POST /api/agent/product
 */
agentRouter.post("/product", asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(req);
    const prompt = body.prompt || body.message || (typeof req.query.prompt === "string" ? req.query.prompt : "");
    const storeId = body.storeId || (typeof req.query.storeId === "string" ? req.query.storeId : undefined);

    if (!prompt) {
        res.status(400).json({ success: false, error: "Missing 'prompt' in request body or query parameter" });
        return;
    }

    const historyRaw = body.history;
    let history: any[] = [];
    if (Array.isArray(historyRaw)) {
        history = historyRaw;
    } else if (typeof historyRaw === "string" && historyRaw.trim()) {
        try { history = JSON.parse(historyRaw); } catch {}
    }

    let fullPrompt = prompt;
    if (history.length > 0) {
        const historyText = history.map((h: any) => `${h.role === 'user' || h.sender === 'user' ? 'Merchant' : 'Agent'}: ${h.content || h.text}`).join("\n");
        fullPrompt = `Previous Conversation History:\n${historyText}\n\nMerchant Current Input: ${prompt}`;
    }

    const reply = await productAgent.execute(fullPrompt, { storeId });
    res.json({ success: true, agent: "product", reply });
}));

/**
 * 3. Inventory Agent Direct Endpoint
 * POST /api/agent/inventory
 */
agentRouter.post("/inventory", asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(req);
    const prompt = body.prompt || body.message || (typeof req.query.prompt === "string" ? req.query.prompt : "");
    const storeId = body.storeId || (typeof req.query.storeId === "string" ? req.query.storeId : undefined);

    if (!prompt) {
        res.status(400).json({ success: false, error: "Missing 'prompt' in request body or query parameter" });
        return;
    }

    const historyRaw = body.history;
    let history: any[] = [];
    if (Array.isArray(historyRaw)) {
        history = historyRaw;
    } else if (typeof historyRaw === "string" && historyRaw.trim()) {
        try { history = JSON.parse(historyRaw); } catch {}
    }

    let fullPrompt = prompt;
    if (history.length > 0) {
        const historyText = history.map((h: any) => `${h.role === 'user' || h.sender === 'user' ? 'Merchant' : 'Agent'}: ${h.content || h.text}`).join("\n");
        fullPrompt = `Previous Conversation History:\n${historyText}\n\nMerchant Current Input: ${prompt}`;
    }

    const reply = await inventoryAgent.execute(fullPrompt, { storeId });
    res.json({ success: true, agent: "inventory", reply });
}));

/**
 * 4. Supplier Agent Direct Endpoint
 * POST /api/agent/supplier
 */
agentRouter.post("/supplier", asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(req);
    const prompt = body.prompt || body.message || (typeof req.query.prompt === "string" ? req.query.prompt : "");
    const storeId = body.storeId || (typeof req.query.storeId === "string" ? req.query.storeId : undefined);

    if (!prompt) {
        res.status(400).json({ success: false, error: "Missing 'prompt' in request body or query parameter" });
        return;
    }

    const historyRaw = body.history;
    let history: any[] = [];
    if (Array.isArray(historyRaw)) {
        history = historyRaw;
    } else if (typeof historyRaw === "string" && historyRaw.trim()) {
        try { history = JSON.parse(historyRaw); } catch {}
    }

    let fullPrompt = prompt;
    if (history.length > 0) {
        const historyText = history.map((h: any) => `${h.role === 'user' || h.sender === 'user' ? 'Merchant' : 'Agent'}: ${h.content || h.text}`).join("\n");
        fullPrompt = `Previous Conversation History:\n${historyText}\n\nMerchant Current Input: ${prompt}`;
    }

    const reply = await supplierAgent.execute(fullPrompt, { storeId });
    res.json({ success: true, agent: "supplier", reply });
}));

/**
 * 5. Growth Agent Direct Endpoint
 * POST /api/agent/growth
 */
agentRouter.post("/growth", asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(req);
    const prompt = body.prompt || body.message || (typeof req.query.prompt === "string" ? req.query.prompt : "");
    const storeId = body.storeId || (typeof req.query.storeId === "string" ? req.query.storeId : undefined);

    if (!prompt) {
        res.status(400).json({ success: false, error: "Missing 'prompt' in request body or query parameter" });
        return;
    }

    const historyRaw = body.history;
    let history: any[] = [];
    if (Array.isArray(historyRaw)) {
        history = historyRaw;
    } else if (typeof historyRaw === "string" && historyRaw.trim()) {
        try { history = JSON.parse(historyRaw); } catch {}
    }

    let fullPrompt = prompt;
    if (history.length > 0) {
        const historyText = history.map((h: any) => `${h.role === 'user' || h.sender === 'user' ? 'Merchant' : 'Agent'}: ${h.content || h.text}`).join("\n");
        fullPrompt = `Previous Conversation History:\n${historyText}\n\nMerchant Current Input: ${prompt}`;
    }

    const reply = await growthAgent.execute(fullPrompt, { storeId });
    res.json({ success: true, agent: "growth", reply });
}));

export default agentRouter;
