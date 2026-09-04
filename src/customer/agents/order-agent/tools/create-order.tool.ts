const createOrderTool = {
    type: "function" as const,
    name: "create_order",
    description: "Create a new order in the system after a purchase has been confirmed.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            customerId: {
                type: "string",
                description: "The unique identifier of the customer.",
            },
            items: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        productId: { type: "string" },
                        qty: { type: "number" },
                    },
                },
                description: "List of items in the order.",
            },
            totalAmount: {
                type: "number",
                description: "The total amount of the order.",
            },
        },
        required: ["customerId", "items", "totalAmount"],
        additionalProperties: false,
    },
};

export { createOrderTool };
