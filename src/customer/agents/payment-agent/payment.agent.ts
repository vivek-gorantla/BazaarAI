import { DEPLOYMENT, openai } from "../../../../model/model-config.js";
import { prompt } from "./prompt.js";
import { initiatePaymentTool } from "./tools/initiate-payment.tool.js";
import { processRefundTool } from "./tools/process-refund.tool.js";
import { checkPaymentStatusTool } from "./tools/check-payment-status.tool.js";

export interface PaymentAgentOptions {
    customerId?: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export class PaymentAgent {
    private tools = [initiatePaymentTool, processRefundTool, checkPaymentStatusTool];

    async execute(message: string, options: PaymentAgentOptions = {}): Promise<string> {
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
                        case "initiate_payment":
                            if (args.amount > args.authorizedAmount) {
                                toolResult = { error: "BLOCKED: Attempted to charge more than authorized." };
                            } else {
                                toolResult = {
                                    paymentId: "PAY-" + Math.floor(Math.random() * 10000),
                                    status: "captured",
                                    amount_processed: args.amount,
                                };
                            }
                            break;
                        case "process_refund":
                            toolResult = {
                                paymentId: args.paymentId,
                                status: "refunded",
                                amount_refunded: args.amount,
                            };
                            break;
                        case "check_payment_status":
                            toolResult = {
                                paymentId: args.paymentId,
                                status: "captured",
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

        return textOutput || "Payment operation completed.";
    }
}

export const paymentAgent = new PaymentAgent();
export async function runPaymentAgent(message: string, customerId?: string, history: any[] = []): Promise<string> {
    return paymentAgent.execute(message, { customerId, conversationHistory: history });
}
