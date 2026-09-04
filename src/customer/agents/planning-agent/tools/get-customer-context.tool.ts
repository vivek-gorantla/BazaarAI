const getCustomerContextTool = {
    type: "function" as const,
    name: "get_customer_context",
    description: "Get context for a specific customer like constraints and preferences.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            customerId: {
                type: "string",
                description: "The unique identifier of the customer.",
            },
        },
        required: ["customerId"],
        additionalProperties: false,
    },
};

export { getCustomerContextTool };
