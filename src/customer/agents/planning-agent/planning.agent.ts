import { DEPLOYMENT, openai } from "../../../../model/model-config.js";
import { prompt } from "./prompt.js";
import { getCustomerContextTool } from "./tools/get-customer-context.tool.js";
import { saveShoppingPlanTool } from "./tools/save-shopping-plan.tool.js";
import { auditLogger } from "../../../lib/kafka-audit.js";

export interface PlanningAgentOptions {
    customerId?: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export class PlanningAgent {
    private tools = [getCustomerContextTool, saveShoppingPlanTool];

    async execute(message: string, options: PlanningAgentOptions = {}): Promise<string> {
        const { customerId, conversationHistory = [] } = options;

        const contextInfo = customerId
            ? `\nActive Customer Context: Customer ID is "${customerId}".`
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

                auditLogger.logAgentEvent("TOOL_CALLED", { toolName, args }, { userId: customerId, agentName: "Planning Agent" });

                let toolResult: unknown;
                try {
                    switch (toolName) {
                        case "get_customer_context":
                            toolResult = {
                                preferences: ["vegetarian", "no nuts"],
                                pastPurchases: [],
                            };
                            break;
                        case "save_shopping_plan":
                            toolResult = { success: true, message: "Plan saved successfully." };
                            break;
                        default:
                            toolResult = { error: `Unknown tool name: ${toolName}` };
                    }
                } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : "Execution failed";
                    toolResult = { error: errorMessage };
                }

                auditLogger.logAgentEvent("TOOL_OUTPUT", { toolName, result: toolResult }, { userId: customerId, agentName: "Planning Agent" });

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((o: any) => o.type === "message" && "content" in o)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .flatMap((o: any) => o.content.filter((c: any) => c.type === "output_text").map((c: any) => c.text))
            .join("\n")
            .trim();

        return textOutput || "Planning operation completed.";
    }
}

export const planningAgent = new PlanningAgent();
export async function runPlanningAgent(message: string, customerId?: string, history: any[] = []): Promise<string> {
    auditLogger.logAgentEvent("AGENT_STARTED", { agentName: "Planning Agent", task: message }, { userId: customerId, agentName: "Planning Agent" });
    const result = await planningAgent.execute(message, { customerId, conversationHistory: history });
    auditLogger.logAgentEvent("AGENT_COMPLETED", { agentName: "Planning Agent", result: result.substring(0, 500) }, { userId: customerId, agentName: "Planning Agent" });
    return result;
}
