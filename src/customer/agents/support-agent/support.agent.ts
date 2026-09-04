import { DEPLOYMENT, openai } from "../../../../model/model-config.js";
import { prompt } from "./prompt.js";
import { checkIssueStatusTool } from "./tools/check-issue-status.tool.js";
import { escalateIssueTool } from "./tools/escalate-issue.tool.js";

export interface SupportAgentOptions {
    customerId?: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export class SupportAgent {
    private tools = [checkIssueStatusTool, escalateIssueTool];

    async execute(message: string, options: SupportAgentOptions = {}): Promise<string> {
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

                let toolResult: unknown;
                try {
                    switch (toolName) {
                        case "check_issue_status":
                            toolResult = {
                                status: "order_out_for_delivery",
                                details: "The order is currently out for delivery and should arrive shortly.",
                            };
                            break;
                        case "escalate_issue":
                            toolResult = {
                                escalated: true,
                                ticketId: "TKT-" + Math.floor(Math.random() * 10000),
                                message: "Issue has been escalated to human support.",
                            };
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((o: any) => o.type === "message" && "content" in o)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .flatMap((o: any) => o.content.filter((c: any) => c.type === "output_text").map((c: any) => c.text))
            .join("\n")
            .trim();

        return textOutput || "Support operation completed.";
    }
}

export const supportAgent = new SupportAgent();
export async function runSupportAgent(message: string, customerId?: string, history: any[] = []): Promise<string> {
    return supportAgent.execute(message, { customerId, conversationHistory: history });
}
