const initiatePaymentTool = {
    type: "function" as const,
    name: "initiate_payment",
    description: "Initiate a payment through the payment gateway.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            orderId: {
                type: "string",
                description: "The order ID.",
            },
            amount: {
                type: "number",
                description: "The authorized amount to charge.",
            },
            authorizedAmount: {
                type: "number",
                description: "The amount that was explicitly approved by the customer.",
            },
        },
        required: ["orderId", "amount", "authorizedAmount"],
        additionalProperties: false,
    },
};

export { initiatePaymentTool };
