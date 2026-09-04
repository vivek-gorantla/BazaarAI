import { DEPLOYMENT, openai } from "../../../../model/model-config.js";
import ProductService from "../../services/product.service.js";
import SupplierService from "../../services/supplier.service.js";
import { searchProductsTool } from "../product-agent/tools/search-products.tool.js";
import { prompt } from "./prompt.js";
import { createPurchaseOrderTool } from "./tools/create-purchase-order.tool.js";
import { createSupplierTool } from "./tools/create-supplier.js";
import { deleteSupplierTool } from "./tools/delete-supplier.js";
import { getSupplierOrdersTool } from "./tools/get-supplier-orders.tool.js";
import { getSupplierTool } from "./tools/get-supplier.tool.js";
import { searchSuppliersTool } from "./tools/search-suppliers.tool.js";
import { updateSupplierTool } from "./tools/update-supplier.js";

export interface SupplierAgentOptions {
    storeId?: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export class SupplierAgent {
    private supplierService = new SupplierService();
    private productService = new ProductService();

    private tools = [
        createSupplierTool,
        updateSupplierTool,
        deleteSupplierTool,
        getSupplierTool,
        searchSuppliersTool,
        createPurchaseOrderTool,
        getSupplierOrdersTool,
        searchProductsTool,
    ];

    async execute(message: string, options: SupplierAgentOptions = {}): Promise<string> {
        const { storeId, conversationHistory = [] } = options;

        const contextInfo = storeId
            ? `\nActive Store Context: Store ID is "${storeId}". Use storeId when managing suppliers or purchase orders.`
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

                if (storeId && !args.storeId) {
                    args.storeId = storeId;
                }

                let toolResult: unknown;
                try {
                    switch (toolName) {
                        case "create_supplier":
                            toolResult = await this.supplierService.createSupplier(args);
                            break;
                        case "update_supplier":
                            toolResult = await this.supplierService.updateSupplier(args);
                            break;
                        case "delete_supplier":
                            toolResult = await this.supplierService.deleteSupplier(args.supplierId);
                            break;
                        case "get_supplier":
                            toolResult = await this.supplierService.getSupplier(args.supplierId);
                            break;
                        case "search_suppliers":
                            toolResult = await this.supplierService.searchSuppliers(args);
                            break;
                        case "create_purchase_order":
                            toolResult = await this.supplierService.createPurchaseOrder(args);
                            break;
                        case "get_supplier_orders":
                            toolResult = await this.supplierService.getSupplierOrders(args);
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

        return textOutput || "Supplier operation completed.";
    }
}

export const supplierAgent = new SupplierAgent();
export async function runSupplierAgent(message: string, storeId?: string): Promise<string> {
    return supplierAgent.execute(message, { storeId });
}
