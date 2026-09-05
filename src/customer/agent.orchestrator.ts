import { openai, DEPLOYMENT } from "../../model/model-config.js";
import { OrchestratorPrompt } from "./orchestrator.prompt.js";
import { CartAgent } from "./agents/cart-agent/cart.agent.js";
import { DiscoveryAgent } from "./agents/discovery-agent/discovery.agent.js";
import { runPlanningAgent } from "./agents/planning-agent/planning.agent.js";
import { runPurchaseAgent } from "./agents/purchase-agent/purchase.agent.js";
import { runCheckoutAgent } from "./agents/checkout-agent/checkout.agent.js";
import { runPaymentAgent } from "./agents/payment-agent/payment.agent.js";
import { runOrderAgent } from "./agents/order-agent/order.agent.js";
import { runSupportAgent } from "./agents/support-agent/support.agent.js";
import { runRecommendationAgent } from "./agents/recommendation-agent/recommendation.agent.js";
import { auditLogger } from "../lib/kafka-audit.js";

async function CustomerAgentOrchestrator(userId: string, userQuery: string, history: any[] = [], res?: any) {
    const response = await openai.responses.create({
        model: DEPLOYMENT,
        input: [
            {
                role: "system",
                content: OrchestratorPrompt,
            },
            ...history,
            {
                role: "user",
                content: `User ID: ${userId}\nUser Query: ${userQuery}`,
            },
        ],
    })

    // Extract raw text from the response
    const rawText = response.output
        .filter((o) => o.type === "message" && "content" in o)
        .flatMap((o) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const content = (o as any).content as Array<{ type: string; text: string }>;
            return content.filter((c) => c.type === "output_text").map((c) => c.text);
        })
        .join("");

    // Parse the JSON block and log the agent name
    try {
        // Strip markdown backticks if present
        const jsonString = rawText.replace(/```json\n?|```/g, "").trim();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsedData = JSON.parse(jsonString) as any;
        const agentName = parsedData.orchestrator_response.agentname;
        
        console.log("Routed to Agent:", agentName);

        auditLogger.logAgentEvent("INTENT_CLASSIFICATION", {
            prompt: userQuery,
            targetAgent: agentName,
        }, {
            userId: userId,
        });

        if (agentName === "Cart Agent") {
            const cartResponse = await CartAgent({ userId, Query: userQuery }, history);
            if (res) {
                res.write(`data: ${JSON.stringify({ textChunk: JSON.stringify(cartResponse), done: true })}\n\n`);
                res.end();
            }
            return JSON.stringify(cartResponse);
        } else if (agentName === "Discovery Agent") {
            const discoveryResponse = await DiscoveryAgent({ userId, Query: userQuery }, history, res);
            // res.end() is handled inside DiscoveryAgent when it finishes streaming
            return JSON.stringify(discoveryResponse);
        } else if (agentName === "Planning Agent") {
            const result = await runPlanningAgent(userQuery, userId, history);
            if (res) { res.write(`data: ${JSON.stringify({ textChunk: typeof result === 'string' ? result : JSON.stringify(result), done: true })}\n\n`); res.end(); }
            return result;
        } else if (agentName === "Recommendation Agent") {
            const result = await runRecommendationAgent(userQuery, userId, history);
            if (res) { res.write(`data: ${JSON.stringify({ textChunk: typeof result === 'string' ? result : JSON.stringify(result), done: true })}\n\n`); res.end(); }
            return result;
        } else if (agentName === "Purchase Agent") {
            const result = await runPurchaseAgent(userQuery, userId, history);
            if (res) { res.write(`data: ${JSON.stringify({ textChunk: typeof result === 'string' ? result : JSON.stringify(result), done: true })}\n\n`); res.end(); }
            return result;
        } else if (agentName === "Checkout Agent") {
            const result = await runCheckoutAgent(userQuery, userId, history);
            if (res) { res.write(`data: ${JSON.stringify({ textChunk: typeof result === 'string' ? result : JSON.stringify(result), done: true })}\n\n`); res.end(); }
            return result;
        } else if (agentName === "Payment Agent") {
            const result = await runPaymentAgent(userQuery, userId, history);
            if (res) { res.write(`data: ${JSON.stringify({ textChunk: typeof result === 'string' ? result : JSON.stringify(result), done: true })}\n\n`); res.end(); }
            return result;
        } else if (agentName === "Order Agent") {
            const result = await runOrderAgent(userQuery, userId, history);
            if (res) { res.write(`data: ${JSON.stringify({ textChunk: typeof result === 'string' ? result : JSON.stringify(result), done: true })}\n\n`); res.end(); }
            return result;
        } else if (agentName === "Support Agent") {
            const result = await runSupportAgent(userQuery, userId, history);
            if (res) { res.write(`data: ${JSON.stringify({ textChunk: typeof result === 'string' ? result : JSON.stringify(result), done: true })}\n\n`); res.end(); }
            return result;
        }

        if (res) { res.write(`data: ${JSON.stringify({ textChunk: `Routing you to the ${agentName}...`, done: true })}\n\n`); res.end(); }
        return `Routing you to the ${agentName}...`;
    } catch (err) {
        console.error("Failed to parse agent name:", rawText);
        if (res) { res.write(`data: ${JSON.stringify({ error: "I encountered an error trying to process your request.", done: true })}\n\n`); res.end(); }
        return "I encountered an error trying to process your request."
    }
}

export { CustomerAgentOrchestrator }