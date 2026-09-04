const updateOrderStatusTool = {
    type: "function" as const,
    name: "update_order_status",
    description: "Update the status of an order (e.g., cancelled).",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            orderId: {
                type: "string",
                description: "The order ID.",
            },
            status: {
                type: "string",
                description: "The new status (e.g., CANCELLED).",
            },
        },
        required: ["orderId", "status"],
        additionalProperties: false,
    },
};

export { updateOrderStatusTool };
