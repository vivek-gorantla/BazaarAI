const checkPaymentStatusTool = {
    type: "function" as const,
    name: "check_payment_status",
    description: "Check the status of an existing payment.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            paymentId: {
                type: "string",
                description: "The payment ID.",
            },
        },
        required: ["paymentId"],
        additionalProperties: false,
    },
};

export { checkPaymentStatusTool };
