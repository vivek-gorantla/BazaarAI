import { ParsingGateway, uploadType } from "../../parsing-layer/parsingGateway.js";
import { DEPLOYMENT, openai } from "../../model/model-config.js";
import { inventoryAgent } from "./merchant-agents/inventory-agent/index.js";
import { productAgent } from "./merchant-agents/product-agent/index.js";
import { supplierAgent } from "./merchant-agents/supplier-agent/index.js";
import { growthAgent } from "./merchant-agents/growth-agent/index.js";
import { auditLogger } from "../lib/kafka-audit.js";

export interface OrchestratorInput {
    merchantId?: string;
    storeId?: string;
    prompt?: string;
    uploadType?: uploadType | "image" | "voice" | "csv" | "text" | string;
    fileBuffer?: Buffer;
    fileUrl?: string;
    textData?: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    targetAgent?: string;
}

export interface OrchestratorResult {
    success: boolean;
    uploadType?: string;
    parsedObservation?: unknown;
    selectedAgent: "product" | "inventory" | "supplier" | "growth" | "orchestrated";
    reply: string;
    error?: string;
}

export class MerchantOrchestrator {
    private gateway = new ParsingGateway();

    /**
     * Main entry point to process merchant requests (voice, image, CSV, text, or multi-turn chat).
     */
    async process(input: OrchestratorInput): Promise<OrchestratorResult> {
        let parsedObservation: unknown = undefined;
        let effectiveTextPrompt = input.prompt || "";
        let detectedType = input.uploadType ? String(input.uploadType).toLowerCase() : undefined;

        // 1. Process media/file parsing through ParsingGateway if input is provided
        if (detectedType || input.fileBuffer || input.fileUrl || input.textData) {
            try {
                if (detectedType === uploadType.VOICE || detectedType === "voice") {
                    detectedType = uploadType.VOICE;
                    if (input.fileBuffer) {
                        const transcription = await this.gateway.Request({
                            uploadType: uploadType.VOICE,
                            data: { voiceUpload: input.fileBuffer },
                            merchantId: input.merchantId,
                        });
                        parsedObservation = transcription;
                        effectiveTextPrompt = `${transcription}\n${input.prompt || ""}`.trim();
                    }
                } else if (detectedType === uploadType.IMAGE || (!detectedType && (input.fileBuffer || input.fileUrl))) {
                    const imgData = input.fileBuffer || input.fileUrl;
                    if (imgData) {
                        parsedObservation = await this.gateway.Request({
                            uploadType: uploadType.IMAGE,
                            data: { imageUpload: imgData },
                            merchantId: input.merchantId,
                        });
                        detectedType = uploadType.IMAGE;
                    }
                } else if (detectedType === uploadType.CSV) {
                    const csvInput = input.fileBuffer || input.textData;
                    if (csvInput) {
                        parsedObservation = await this.gateway.Request({
                            uploadType: uploadType.CSV,
                            data: { csv: csvInput },
                            merchantId: input.merchantId,
                        });
                    }
                } else if (detectedType === uploadType.TEXT && input.textData) {
                    parsedObservation = await this.gateway.Request({
                        uploadType: uploadType.TEXT,
                        data: { text: input.textData },
                        merchantId: input.merchantId,
                    });
                    if (!effectiveTextPrompt) {
                        effectiveTextPrompt = String(parsedObservation);
                    }
                }
            } catch (err: unknown) {
                console.error("[MerchantOrchestrator] ParsingGateway error:", err);
                const errMsg = err instanceof Error ? err.message : "Parsing gateway failed";
                return {
                    success: false,
                    selectedAgent: "orchestrated",
                    reply: `Error parsing input: ${errMsg}`,
                    error: errMsg,
                };
            }
        }

        // 2. Build combined prompt message incorporating observations
        let agentMessage = effectiveTextPrompt;
        if (parsedObservation) {
            if (typeof parsedObservation === "string") {
                agentMessage = `Voice Transcription:\n"${parsedObservation}"\n\nMerchant Instruction: ${effectiveTextPrompt || "Process the above voice transcription."}`;
            } else {
                agentMessage = `Observation Data from ${detectedType || "Parser"}:\n${JSON.stringify(parsedObservation, null, 2)}\n\nMerchant Instruction: ${effectiveTextPrompt || "Process the above observation."}`;
            }
        }

        if (!agentMessage.trim()) {
            return {
                success: false,
                selectedAgent: "orchestrated",
                reply: "Please provide a text prompt or upload a file (image, voice, CSV) to process.",
            };
        }

        // 3. Classify Intent to select the appropriate Merchant Agent
        let targetAgent: "product" | "inventory" | "supplier" | "growth";
        if (input.targetAgent && input.targetAgent !== "auto") {
            targetAgent = input.targetAgent as "product" | "inventory" | "supplier" | "growth";
        } else {
            targetAgent = await this.classifyIntent(agentMessage);
        }

        auditLogger.logAgentEvent("INTENT_CLASSIFICATION", {
            prompt: effectiveTextPrompt,
            parsedObservation,
            targetAgent,
        }, {
            merchantId: input.merchantId,
            storeId: input.storeId,
        });

        // 4. Delegate execution to selected Agent
        let reply = "";
        try {
            switch (targetAgent) {
                case "product":
                    reply = await productAgent.execute(agentMessage, {
                        storeId: input.storeId,
                        conversationHistory: input.conversationHistory,
                    });
                    break;
                case "inventory":
                    reply = await inventoryAgent.execute(agentMessage, {
                        storeId: input.storeId,
                        conversationHistory: input.conversationHistory,
                    });
                    break;
                case "supplier":
                    reply = await supplierAgent.execute(agentMessage, {
                        storeId: input.storeId,
                        conversationHistory: input.conversationHistory,
                    });
                    break;
                case "growth":
                    reply = await growthAgent.execute(agentMessage, {
                        storeId: input.storeId,
                        conversationHistory: input.conversationHistory,
                    });
                    break;
                default:
                    reply = await inventoryAgent.execute(agentMessage, {
                        storeId: input.storeId,
                        conversationHistory: input.conversationHistory,
                    });
            }
        } catch (err: unknown) {
            console.error(`[MerchantOrchestrator] Error executing ${targetAgent} agent:`, err);
            const errMsg = err instanceof Error ? err.message : "Agent execution failed";
            return {
                success: false,
                uploadType: detectedType,
                parsedObservation,
                selectedAgent: targetAgent,
                reply: `Error executing ${targetAgent} agent: ${errMsg}`,
                error: errMsg,
            };
        }

        return {
            success: true,
            uploadType: detectedType,
            parsedObservation,
            selectedAgent: targetAgent,
            reply,
        };
    }

    /**
     * Determines whether a merchant request belongs to Product, Inventory, Supplier, or Growth agent.
     */
    private async classifyIntent(message: string): Promise<"product" | "inventory" | "supplier" | "growth"> {
        try {
            const res = await openai.responses.create({
                model: DEPLOYMENT,
                input: [
                    {
                        role: "system",
                        content: `You are the Master Orchestrator for a retail Merchant AI system. Your job is to classify the merchant's request and route it to exactly one of four specialized agents: "product", "inventory", "supplier", or "growth".

Understand what each agent can actually do based on their route capabilities:

1. "product" (Product Catalog Agent):
   - Responsible for modifying the static details of products in the catalog.
   - Use this for creating new products, renaming products, setting or changing the price, updating descriptions, editing attributes, changing the category, changing the unit of measurement, or deleting a product.

2. "inventory" (Inventory & Stock Agent):
   - Responsible for tracking and modifying the dynamic quantities of items in the store.
   - Use this for any requests related to stock levels, increasing/decreasing/restocking units, checking how many items are left, querying low stock or out-of-stock items, or viewing inventory history.

3. "supplier" (Supplier & Procurement Agent):
   - Responsible for B2B relationships and ordering.
   - Use this for creating new suppliers (even if a category is mentioned), managing vendor/supplier contact info, issuing purchase orders, listing pending orders, or receiving shipments from a supplier.

4. "growth" (Growth & POS Agent):
   - Responsible for driving revenue, running campaigns, and acting as a Point of Sale (POS) checkout assistant.
   - Use this when the merchant wants to create a discount campaign, configure an upsell or cross-sell, or says they are checking out a customer / ringing up a sale right now (Conversational Checkout).

Analyze the user's intent carefully. (e.g., "increase stock of toothbrush to 50units" -> "inventory". "Checkout 2 milks for cash" -> "growth". "Run a 10% discount on Dairy" -> "growth").
Return ONLY a single word: "product", "inventory", "supplier", or "growth".`,
                    },
                    { role: "user", content: message },
                ],
            });

            const rawText = res.output
                .filter((o) => o.type === "message" && "content" in o)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .flatMap((o: any) => o.content.filter((c: any) => c.type === "output_text").map((c: any) => c.text))
                .join("")
                .trim()
                .toLowerCase();

            if (rawText.includes("supplier")) return "supplier";
            if (rawText.includes("product")) return "product";
            if (rawText.includes("growth")) return "growth";
            if (rawText.includes("inventory")) return "inventory";
        } catch (err) {
            console.error("[MerchantOrchestrator] Intent classification failed, defaulting to inventory:", err);
        }

        return "inventory";
    }
}

export const merchantOrchestrator = new MerchantOrchestrator();
