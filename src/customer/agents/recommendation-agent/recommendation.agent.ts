import { DEPLOYMENT, openai } from "../../../../model/model-config.js";
import ProductService from "../../../agents/services/product.service.js";
import { prompt } from "./prompt.js";
import { searchProductsTool } from "./tools/search-products.tool.js";
import { getProductTool } from "./tools/get-product.tool.js";
import { getCustomerPreferencesTool } from "./tools/get-customer-preferences.tool.js";
import { getProductRatingsTool } from "./tools/get-product-ratings.tool.js";
import { getProductAvailabilityTool } from "./tools/get-product-availability.tool.js";
import { getSimilarProductsTool } from "./tools/get-similar-products.tool.js";

export interface RecommendationAgentOptions {
    customerId?: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export class RecommendationAgent {
    private productService = new ProductService();

    private tools = [
        searchProductsTool,
        getProductTool,
        getCustomerPreferencesTool,
        getProductRatingsTool,
        getProductAvailabilityTool,
        getSimilarProductsTool,
    ];

    async execute(message: string, options: RecommendationAgentOptions = {}): Promise<string> {
        const { customerId, conversationHistory = [] } = options;

        const contextInfo = customerId
            ? `\nActive Customer Context: Customer ID is "${customerId}". Use this when fetching preferences.`
            : "";
        const instructions = `${prompt}${contextInfo}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const functionCalls = response.output.filter((item: any) => item.type === "function_call");
            if (functionCalls.length === 0) {
                break;
            }

            // Append model output (containing the function_call items) to input trajectory
            messages.push(...response.output);

            const functionOutputs: Array<{
                type: "function_call_output";
                call_id: string;
                output: string;
            }> = [];

            for (const item of functionCalls) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fnItem = item as any;
                const callId = fnItem.call_id;
                const toolName = fnItem.name;
                const args = fnItem.arguments ? JSON.parse(fnItem.arguments) : {};

                let toolResult: unknown;
                try {
                    switch (toolName) {
                        case "search_products":
                            toolResult = await this.productService.searchProducts(args);
                            break;
                        case "get_product":
                            toolResult = await this.productService.getProduct(args.productId);
                            break;
                        case "get_customer_preferences":
                            // Mocking customer preferences for now
                            toolResult = {
                                dietaryRequirements: ["vegetarian"],
                                budgetConstraint: null,
                                preferredBrands: [],
                                allergies: ["nuts"],
                            };
                            break;
                        case "get_product_ratings":
                            // Mocking product ratings
                            toolResult = {
                                productId: args.productId,
                                averageRating: 4.5,
                                totalReviews: Math.floor(Math.random() * 100) + 1,
                            };
                            break;
                        case "get_product_availability":
                            const p = await this.productService.getProduct(args.productId);
                            if (p) {
                                toolResult = {
                                    productId: args.productId,
                                    available: Number(p.stockQty) > 0,
                                    stockQty: p.stockQty,
                                };
                            } else {
                                toolResult = { error: "Product not found" };
                            }
                            break;
                        case "get_similar_products":
                            const originalProduct = await this.productService.getProduct(args.productId);
                            if (originalProduct) {
                                toolResult = await this.productService.searchProducts({
                                    category: originalProduct.category,
                                    limit: args.limit || 5,
                                });
                            } else {
                                toolResult = { error: "Original product not found" };
                            }
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

            // Append function outputs to input trajectory
            messages.push(...functionOutputs);

            response = await openai.responses.create({
                model: DEPLOYMENT,
                input: messages,
                tools: this.tools,
            });
        }

        const textOutput = response.output
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((o: any) => o.type === "message" && "content" in o)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .flatMap((o: any) => o.content.filter((c: any) => c.type === "output_text").map((c: any) => c.text))
            .join("\n")
            .trim();

        return textOutput || "Recommendation operation completed.";
    }
}

export const recommendationAgent = new RecommendationAgent();
export async function runRecommendationAgent(message: string, customerId?: string, history: any[] = []): Promise<string> {
    return recommendationAgent.execute(message, { customerId, conversationHistory: history });
}
