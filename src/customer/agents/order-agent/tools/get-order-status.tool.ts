const getOrderStatusTool = {
    type: "function" as const,
    name: "get_order_status",
    description: "Get the current status of an order.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            orderId: {
                type: "string",
                description: "The order ID.",
            },
        },
        required: ["orderId"],
        additionalProperties: false,
    },
};

export { getOrderStatusTool };
