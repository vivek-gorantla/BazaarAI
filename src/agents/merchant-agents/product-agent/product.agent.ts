import { DEPLOYMENT, openai } from "../../../../model/model-config.js";
import ProductService from "../../services/product.service.js";
import { prompt } from "./prompt.js";
import { checkProductExistsTool } from "./tools/check-product-exists.tool.js";
import { createProductTool } from "./tools/create-product.tool.js";
import { deleteProductTool } from "./tools/delete-product.tool.js";
import { getProductTool } from "./tools/getProduct.tool.js";
import { searchProductsTool } from "./tools/search-products.tool.js";
import { updateProductTool } from "./tools/update-product.tool.js";
import { auditLogger } from "../../../lib/kafka-audit.js";

export interface ProductAgentOptions {
    storeId?: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export class ProductAgent {
    private productService = new ProductService();

    private tools = [
        createProductTool,
        checkProductExistsTool,
        deleteProductTool,
        getProductTool,
        searchProductsTool,
        updateProductTool,
    ];

    async execute(message: string, options: ProductAgentOptions = {}): Promise<string> {
        const { storeId, conversationHistory = [] } = options;

        const contextInfo = storeId
            ? `\nActive Store Context: Store ID is "${storeId}". Use storeId when managing products.`
            : "";
        const instructions = `${prompt}${contextInfo}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const messages: any[] = [
            { role: "system", content: instructions },
            ...conversationHistory,
            { role: "user", content: message },
        ];

        auditLogger.logAgentEvent("AGENT_STARTED", {
            agentName: "ProductAgent",
            message,
        }, { storeId });

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

                if (storeId && !args.storeId) {
                    args.storeId = storeId;
                }

                auditLogger.logAgentEvent("TOOL_CALLED", {
                    toolName,
                    args,
                }, { storeId, agentName: "ProductAgent" });

                let toolResult: unknown;
                try {
                    switch (toolName) {
                        case "create_product":
                            toolResult = await this.productService.createProduct(args);
                            break;
                        case "check_product_exists":
                            toolResult = await this.productService.checkProductExists(args.productId, args.storeId);
                            break;
                        case "delete_product":
                            toolResult = await this.productService.deleteProduct(args.productId, args.storeId);
                            break;
                        case "get_product":
                            toolResult = await this.productService.getProduct(args.productId, args.storeId);
                            break;
                        case "search_products":
                            toolResult = await this.productService.searchProducts(args);
                            break;
                        case "update_product":
                            toolResult = await this.productService.updateProduct(args);
                            break;
                        default:
                            toolResult = { error: `Unknown tool name: ${toolName}` };
                    }
                } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : "Execution failed";
                    toolResult = { error: errorMessage };
                }

                auditLogger.logAgentEvent("TOOL_OUTPUT", {
                    toolName,
                    toolResult,
                }, { storeId, agentName: "ProductAgent" });

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

        auditLogger.logAgentEvent("AGENT_COMPLETED", {
            agentName: "ProductAgent",
            response: textOutput,
        }, { storeId });

        return textOutput || "Product operation completed.";
    }
}

export const productAgent = new ProductAgent();
export async function runProductAgent(message: string, storeId?: string): Promise<string> {
    return productAgent.execute(message, { storeId });
}
