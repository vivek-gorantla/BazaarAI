import { openai, DEPLOYMENT } from "../../../../model/model-config.js";
import { CartAgentPrompt } from "./cart.agent.prompt.js";
import { addtocartTool } from "./tools/addtocart.js";
import { applycouponTool } from "./tools/applycoupon.tool.js";
import { calculatecarttotalTool } from "./tools/calculatecarttotal.tool.js";
import { getcartTool } from "./tools/getcart.tool.js";
import { removefromcartTool } from "./tools/removefromcart.tool.js";
import { updatecartitemTool } from "./tools/updatecartitem.tool.js";
import { validatecartTool } from "./tools/validatecart.tool.js";
import { CustomerService } from "../../customer.service.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface CartData {
    Query: string,
    userId: string,
    productId?: string,
    storeId?: string,
    quantity?: number,
    couponCode?: string
}

const cartTools = [
    addtocartTool,
    applycouponTool,
    calculatecarttotalTool,
    getcartTool,
    removefromcartTool,
    updatecartitemTool,
    validatecartTool
];

async function CartAgent(data: CartData, history: any[] = []) {
    const customerService = new CustomerService();
    const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: CartAgentPrompt },
        ...history,
        { role: "user", content: `userId: ${data.userId}\nQuery: ${data.Query}` }
    ];

    while (true) {
        const response = await openai.chat.completions.create({
            model: DEPLOYMENT,
            messages: messages,
            tools: cartTools,
            tool_choice: "auto",
        });

        const responseMessage = response.choices[0].message;
        messages.push(responseMessage);

        if (responseMessage.tool_calls) {
            for (const toolCall of responseMessage.tool_calls) {
                if (toolCall.type !== "function") continue;
                
                const args = JSON.parse(toolCall.function.arguments);
                let toolResult: any;

                try {
                    switch (toolCall.function.name) {
                        case "add_to_cart":
                            toolResult = await customerService.addToCart(args.userId, args.productId, args.storeId, args.quantity);
                            break;
                        case "remove_from_cart":
                            toolResult = await customerService.removeFromCart(args.userId, args.productId, args.storeId);
                            break;
                        case "update_cart_item":
                            toolResult = await customerService.updateCartItem(args.userId, args.productId, args.storeId, args.quantity);
                            break;
                        case "get_cart":
                            toolResult = await customerService.getCart(args.userId);
                            break;
                        case "calculate_cart_total":
                            toolResult = await customerService.calculateCartTotal(args.userId);
                            break;
                        case "apply_coupon":
                            toolResult = await customerService.applyCoupon(args.userId, args.couponCode);
                            break;
                        case "validate_cart":
                            toolResult = await customerService.validateCart(args.userId);
                            break;
                        default:
                            toolResult = { error: "Unknown tool" };
                    }
                } catch (error: any) {
                    toolResult = { error: error.message };
                }

                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult)
                });
            }
        } else {
            // No more tool calls, return the final message
            try {
                // Return parsed JSON if possible according to CartAgentPrompt
                return JSON.parse(responseMessage.content?.replace(/```json\n?|```/g, "").trim() || "{}");
            } catch {
                return { cart_response: { message: responseMessage.content } };
            }
        }
    }
}

export { CartAgent };
