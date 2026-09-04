const processRefundTool = {
    type: "function" as const,
    name: "process_refund",
    description: "Process a refund for a specific payment.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            paymentId: {
                type: "string",
                description: "The payment ID.",
            },
            amount: {
                type: "number",
                description: "The amount to refund.",
            },
        },
        required: ["paymentId", "amount"],
        additionalProperties: false,
    },
};

export { processRefundTool };
