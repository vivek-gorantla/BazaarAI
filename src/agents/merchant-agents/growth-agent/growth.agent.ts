import { DEPLOYMENT, openai } from "../../../../model/model-config.js";
import GrowthService from "../../services/growth.service.js";
import { prompt } from "./prompt.js";
import { campaignOrchestrationTool } from "./tools/campaign-orchestration.tool.js";
import { createUpsellTool } from "./tools/create-upsell.tool.js";
import { createCrossSellTool } from "./tools/create-cross-sell.tool.js";
import { conversationalCheckoutTool } from "./tools/conversational-checkout.tool.js";
// We also import search tool so the agent can find product IDs before checkout/upsell
import { searchProductsTool } from "../product-agent/tools/search-products.tool.js";
import ProductService from "../../services/product.service.js";

export interface GrowthAgentOptions {
    storeId?: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export class GrowthAgent {
    private growthService = new GrowthService();
    private productService = new ProductService();

    private tools = [
        campaignOrchestrationTool,
        createUpsellTool,
        createCrossSellTool,
        conversationalCheckoutTool,
        searchProductsTool
    ];

    async execute(message: string, options: GrowthAgentOptions = {}): Promise<string> {
        const { storeId, conversationHistory = [] } = options;

        const contextInfo = storeId
            ? `\nActive Store Context: Store ID is "${storeId}". Use storeId when managing marketing and checkout.`
            : "";
        const instructions = `${prompt}${contextInfo}`;

        const messages: any[] = [
            { role: "system", content: instructions },
            ...conversationHistory,
            { role: "user", content: message },
        ];

        let response = await openai.responses.create({
            model: DEPLOYMENT,
            input: messages,
            tools: this.tools,
        });

        let maxTurnCount = 5;
        while (maxTurnCount > 0) {
            maxTurnCount--;

            const functionCalls = response.output.filter((item: any) => item.type === "function_call");
            if (functionCalls.length === 0) {
                break;
            }

            messages.push(...response.output);
            const functionOutputs: Array<{ type: "function_call_output"; call_id: string; output: string; }> = [];

            for (const item of functionCalls) {
                const fnItem = item as any;
                const callId = fnItem.call_id;
                const toolName = fnItem.name;
                const args = fnItem.arguments ? JSON.parse(fnItem.arguments) : {};

                if (storeId && !args.storeId) {
                    args.storeId = storeId;
                }

                let toolResult: unknown;
                try {
                    switch (toolName) {
                        case "campaign_orchestration":
                            toolResult = await this.growthService.orchestrateCampaign(args);
                            break;
                        case "create_upsell":
                            toolResult = await this.growthService.createUpsell(args);
                            break;
                        case "create_cross_sell":
                            toolResult = await this.growthService.createCrossSell(args);
                            break;
                        case "conversational_checkout":
                            toolResult = await this.growthService.conversationalCheckout(args);
                            break;
                        case "search_products":
                            toolResult = await this.productService.searchProducts(args);
                            break;
                        default:
                            toolResult = { error: `Unknown tool name: ${toolName}` };
                    }
                } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : "Execution failed";
                    toolResult = { error: errorMessage };
                }

                functionOutputs.push({
                    type: "function_call_output",
                    call_id: callId,
                    output: JSON.stringify(toolResult ?? null),
                });
            }

            messages.push(...functionOutputs);
            response = await openai.responses.create({
                model: DEPLOYMENT,
                input: messages,
                tools: this.tools,
            });
        }

        const textOutput = response.output
            .filter((o: any) => o.type === "message" && "content" in o)
            .flatMap((o: any) => o.content.filter((c: any) => c.type === "output_text").map((c: any) => c.text))
            .join("\n")
            .trim();

        return textOutput || "Growth operation completed.";
    }
}

export const growthAgent = new GrowthAgent();
export async function runGrowthAgent(message: string, storeId?: string): Promise<string> {
    return growthAgent.execute(message, { storeId });
}
