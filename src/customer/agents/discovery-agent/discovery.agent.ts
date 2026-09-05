import { openai, DEPLOYMENT } from "../../../../model/model-config.js";
import { DiscoveryAgentPrompt } from "./discovery.agent.prompt.js";
import { searchproductsTool } from "./tools/searchproducts.tool.js";
import { getproductTool } from "./tools/getproduct.tool.js";
import { searchmerchantsTool } from "./tools/searchmerchants.tool.js";
import { checkavailabilityTool } from "./tools/checkavailability.tool.js";
import { searchcategoriesTool } from "./tools/searchcategories.tool.js";
import { CustomerService } from "../../customer.service.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { auditLogger } from "../../../lib/kafka-audit.js";

const discoveryTools = [
    searchproductsTool,
    getproductTool,
    searchmerchantsTool,
    checkavailabilityTool,
    searchcategoriesTool
];

export async function DiscoveryAgent(data: { userId: string; Query: string }, history: any[] = [], res?: any) {
    auditLogger.logAgentEvent("AGENT_STARTED", { agentName: "Discovery Agent", task: data.Query }, { userId: data.userId, agentName: "Discovery Agent" });
    const customerService = new CustomerService();

    const messages: ChatCompletionMessageParam[] = [
        {
            role: "system",
            content: DiscoveryAgentPrompt
        },
        ...history,
        {
            role: "user",
            content: `User ID: ${data.userId}\nUser Query: ${data.Query}`
        }
    ];

    let allDiscoveredProducts: any[] = [];

    while (true) {
        const stream = await openai.chat.completions.create({
            model: DEPLOYMENT,
            messages: messages,
            tools: discoveryTools,
            tool_choice: "auto",
            stream: true
        });

        let content = "";
        const toolCalls: any[] = [];

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;
            
            if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                    if (tc.index === undefined) continue;
                    if (!toolCalls[tc.index]) {
                        toolCalls[tc.index] = { 
                            id: tc.id, 
                            type: "function", 
                            function: { name: tc.function?.name || "", arguments: "" } 
                        };
                    }
                    if (tc.function?.arguments) {
                        toolCalls[tc.index].function.arguments += tc.function.arguments;
                    }
                }
            } else if (delta.content) {
                content += delta.content;
                if (res) {
                    res.write(`data: ${JSON.stringify({ textChunk: delta.content })}\n\n`);
                    if (typeof res.flush === "function") res.flush();
                }
            }
        }

        const validToolCalls = toolCalls.filter(Boolean);

        if (validToolCalls.length > 0) {
            messages.push({
                role: "assistant",
                content: content || null,
                tool_calls: validToolCalls
            } as ChatCompletionMessageParam);

            if (res) {
                res.write(`data: ${JSON.stringify({ textChunk: "*(Searching catalog...)*\n\n" })}\n\n`);
                if (typeof res.flush === "function") res.flush();
            }

            for (const toolCall of validToolCalls) {
                const args = JSON.parse(toolCall.function.arguments);
                auditLogger.logAgentEvent("TOOL_CALLED", { toolName: toolCall.function.name, args }, { userId: data.userId, agentName: "Discovery Agent" });
                let toolResult: any;

                try {
                    switch (toolCall.function.name) {
                        case "search_products":
                            toolResult = await customerService.searchProducts(args.query);
                            if (Array.isArray(toolResult)) allDiscoveredProducts.push(...toolResult);
                            break;
                        case "get_product":
                            toolResult = await customerService.getProduct(args.productId);
                            if (toolResult && toolResult.id) allDiscoveredProducts.push(toolResult);
                            break;
                        case "search_merchants":
                            toolResult = await customerService.searchMerchants(args.location, args.productId);
                            break;
                        case "check_availability":
                            toolResult = await customerService.checkAvailability(args.productId, args.storeId, args.quantity);
                            break;
                        case "search_categories":
                            toolResult = await customerService.searchCategories();
                            break;
                        default:
                            toolResult = { error: "Unknown tool" };
                    }
                } catch (error: any) {
                    toolResult = { error: error.message };
                }

                auditLogger.logAgentEvent("TOOL_OUTPUT", { toolName: toolCall.function.name, result: toolResult }, { userId: data.userId, agentName: "Discovery Agent" });

                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult)
                });
            }
        } else {
            // Reached final answer
            // Deduplicate products
            const uniqueProducts = Array.from(new Map(allDiscoveredProducts.map(item => [item.id, item])).values());
            const finalData = {
                discovery_response: {
                    message: content,
                    resolved_items: uniqueProducts
                }
            };
            if (res) {
                res.write(`data: ${JSON.stringify({ products: uniqueProducts, done: true })}\n\n`);
                res.end();
            }
            auditLogger.logAgentEvent("AGENT_COMPLETED", { agentName: "Discovery Agent", result: "Discovery finished." }, { userId: data.userId, agentName: "Discovery Agent" });
            return finalData;
        }
    }
}
