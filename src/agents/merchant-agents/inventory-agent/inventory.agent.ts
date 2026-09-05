import { DEPLOYMENT, openai } from "../../../../model/model-config.js";
import InventoryService from "../../services/inventory.service.js";
import ProductService from "../../services/product.service.js";
import { searchProductsTool } from "../product-agent/tools/search-products.tool.js";
import { deleteProductTool } from "../product-agent/tools/delete-product.tool.js";
import { createProductTool } from "../product-agent/tools/create-product.tool.js";
import { updateProductTool } from "../product-agent/tools/update-product.tool.js";
import { systemprompt } from "./prompt.js";
import { decreaseStockTool } from "./tools/decrease-stock.tool.js";
import { getInventoryHistoryTool } from "./tools/get-inventory-history.tool.js";
import { getInventorySummaryTool } from "./tools/get-inventory-summary.tool.js";
import { getLowStockTool } from "./tools/get-low-stock.tool.js";
import { getOutOfStockTool } from "./tools/get-outof-stcok.tool.js";
import { getStockTool } from "./tools/get-stock.tool.js";
import { increaseStockTool } from "./tools/increase-stock.tool.js";
import { setStockTool } from "./tools/set-stock.tool.js";
import { auditLogger } from "../../../lib/kafka-audit.js";

export interface InventoryAgentOptions {
    storeId?: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export class InventoryAgent {
    private inventoryService = new InventoryService();
    private productService = new ProductService();

    private tools = [
        setStockTool,
        increaseStockTool,
        decreaseStockTool,
        getStockTool,
        getLowStockTool,
        getOutOfStockTool,
        getInventorySummaryTool,
        getInventoryHistoryTool,
        searchProductsTool,
        deleteProductTool,
        createProductTool,
        updateProductTool,
    ];

    async execute(message: string, options: InventoryAgentOptions = {}): Promise<string> {
        const { storeId, conversationHistory = [] } = options;

        const contextInfo = storeId
            ? `\nActive Store Context: Store ID is "${storeId}". Use storeId when querying or modifying inventory.`
            : "";
        const instructions = `${systemprompt}${contextInfo}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const messages: any[] = [
            { role: "system", content: instructions },
            ...conversationHistory,
            { role: "user", content: message },
        ];

        auditLogger.logAgentEvent("AGENT_STARTED", {
            agentName: "InventoryAgent",
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
                }, { storeId, agentName: "InventoryAgent" });

                let toolResult: unknown;
                try {
                    switch (toolName) {
                        case "set_stock":
                            toolResult = await this.inventoryService.setStock(args);
                            break;
                        case "increase_stock":
                            toolResult = await this.inventoryService.increaseStock(args);
                            break;
                        case "decrease_stock":
                            toolResult = await this.inventoryService.decreaseStock(args);
                            break;
                        case "get_stock":
                            toolResult = await this.inventoryService.getStock(args.productId, args.storeId);
                            break;
                        case "get_low_stock":
                            toolResult = await this.inventoryService.getLowStock(args);
                            break;
                        case "get_out_of_stock":
                            toolResult = await this.inventoryService.getOutOfStock(args);
                            break;
                        case "get_inventory_summary":
                            toolResult = await this.inventoryService.getInventorySummary(args.storeId);
                            break;
                        case "get_inventory_history":
                            toolResult = await this.inventoryService.getInventoryHistory(args);
                            break;
                        case "search_products":
                            toolResult = await this.productService.searchProducts(args);
                            break;
                        case "delete_product":
                            toolResult = await this.productService.deleteProduct(args.productId, args.storeId);
                            break;
                        case "create_product":
                            toolResult = await this.productService.createProduct(args);
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
                }, { storeId, agentName: "InventoryAgent" });

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
            agentName: "InventoryAgent",
            response: textOutput,
        }, { storeId });

        return textOutput || "Inventory operation completed.";
    }
}

export const inventoryAgent = new InventoryAgent();
export async function runInventoryAgent(message: string, storeId?: string): Promise<string> {
    return inventoryAgent.execute(message, { storeId });
}
