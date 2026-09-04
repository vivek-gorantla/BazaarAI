const reviewCartTool = {
    type: "function" as const,
    name: "review_cart",
    description: "Review the items in the user's cart and validate availability.",
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

export { reviewCartTool };
