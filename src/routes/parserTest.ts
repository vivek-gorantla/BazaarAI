import { Router, Request, Response } from "express";
import multer from "multer";
import { imageParser } from "../../parsing-layer/imageParser.js";
import { parseCsvProducts } from "../../parsing-layer/csvParser.js";
import { textParser } from "../../parsing-layer/textParser.js";
import { VoiceParser } from "../../parsing-layer/voiceParser.js";
import { ParsingGateway, uploadType } from "../../parsing-layer/parsingGateway.js";

const upload = multer({ storage: multer.memoryStorage() });
const parserRouter = Router();
const gateway = new ParsingGateway();

/**
 * 1. Image Parser Test Route
 * POST /api/parse/image
 * Accepts multipart/form-data with file field 'file' or 'image', OR JSON { "imageUrl": "..." }
 */
parserRouter.post("/image", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
    try {
        let inputData: Buffer | string | undefined;

        if (req.file) {
            inputData = req.file.buffer;
        } else if (req.body.imageUrl || req.body.image) {
            inputData = req.body.imageUrl || req.body.image;
        }

        if (!inputData) {
            res.status(400).json({ error: "No image file uploaded (field 'file') or imageUrl provided in body" });
            return;
        }

        const result = await imageParser(inputData);
        res.json({ success: true, parser: "image", data: result });
    } catch (err: any) {
        console.error("Image parser test route error:", err);
        res.status(500).json({ error: err.message || "Image parsing failed" });
    }
});

/**
 * 2. CSV Parser Test Route
 * POST /api/parse/csv
 * Accepts multipart/form-data with file field 'file' or 'csv', OR JSON { "csvText": "..." }
 */
parserRouter.post("/csv", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
    try {
        let csvInput: Buffer | string | undefined;

        if (req.file) {
            csvInput = req.file.buffer;
        } else if (req.body.csvText || req.body.csv) {
            csvInput = req.body.csvText || req.body.csv;
        }

        if (!csvInput) {
            res.status(400).json({ error: "No CSV file uploaded (field 'file') or csvText provided in body" });
            return;
        }

        const result = await parseCsvProducts(csvInput);
        res.json({ success: true, parser: "csv", data: result });
    } catch (err: any) {
        console.error("CSV parser test route error:", err);
        res.status(500).json({ error: err.message || "CSV parsing failed" });
    }
});

/**
 * 3. Text Parser Test Route
 * POST /api/parse/text
 * Accepts JSON { "text": "..." } or plain text body
 */
parserRouter.post("/text", (req: Request, res: Response): void => {
    try {
        const textInput = typeof req.body === "string" ? req.body : req.body.text;

        if (textInput === undefined) {
            res.status(400).json({ error: "Missing 'text' in body" });
            return;
        }

        const result = textParser(textInput);
        res.json({ success: true, parser: "text", normalizedText: result });
    } catch (err: any) {
        console.error("Text parser test route error:", err);
        res.status(500).json({ error: err.message || "Text parsing failed" });
    }
});

/**
 * 4. Voice Parser Test Route
 * POST /api/parse/voice
 * Accepts multipart/form-data with file field 'file' or 'voice'
 */
parserRouter.post("/voice", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No voice audio file uploaded (field 'file')" });
            return;
        }

        const result = await VoiceParser(req.file.buffer);
        res.json({ success: true, parser: "voice", data: result });
    } catch (err: any) {
        console.error("Voice parser test route error:", err);
        res.status(500).json({ error: err.message || "Voice parsing failed" });
    }
});

/**
 * 5. Parsing Gateway Test Route
 * POST /api/parse/gateway
 * Form-data or JSON with 'uploadType' ('image' | 'voice' | 'csv' | 'text') and payload
 */
parserRouter.post("/gateway", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
    try {
        const typeStr = req.body.uploadType || req.body.type;
        if (!typeStr) {
            res.status(400).json({ error: "Missing 'uploadType' field (options: 'image', 'voice', 'csv', 'text')" });
            return;
        }

        const type = typeStr.toLowerCase() as uploadType;
        let payload: any;

        if (type === uploadType.IMAGE) {
            payload = { imageUpload: req.file ? req.file.buffer : req.body.imageUrl || req.body.image };
        } else if (type === uploadType.CSV) {
            payload = { csv: req.file ? req.file.buffer : req.body.csvText || req.body.csv };
        } else if (type === uploadType.VOICE) {
            payload = { voiceUpload: req.file ? req.file.buffer : req.body.audio };
        } else if (type === uploadType.TEXT) {
            payload = { text: req.body.text };
        } else {
            res.status(400).json({ error: `Unsupported uploadType: ${typeStr}` });
            return;
        }

        const result = await gateway.Request({
            uploadType: type,
            data: payload,
            merchantId: req.body.merchantId,
        });

        res.json({ success: true, gateway: true, uploadType: type, data: result });
    } catch (err: any) {
        console.error("Gateway test route error:", err);
        res.status(500).json({ error: err.message || "Parsing gateway failed" });
    }
});

export default parserRouter;
