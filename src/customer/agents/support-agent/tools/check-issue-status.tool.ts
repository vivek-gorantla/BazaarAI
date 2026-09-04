const checkIssueStatusTool = {
    type: "function" as const,
    name: "check_issue_status",
    description: "Check the status of an issue related to an order or payment.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            orderId: {
                type: "string",
                description: "The order ID.",
            },
            paymentId: {
                type: "string",
                description: "The payment ID.",
            },
        },
        required: [],
        additionalProperties: false,
    },
};

export { checkIssueStatusTool };
