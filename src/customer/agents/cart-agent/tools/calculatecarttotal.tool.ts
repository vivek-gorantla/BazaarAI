const calculatecarttotalTool = {
    type: "function" as const,
    function: {
        name: "calculate_cart_total",
        description: "Calculates the total monetary value of all items in the user's cart.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    description: "The ID of the user whose cart total should be calculated.",
                },
            },
            required: ["userId"],
            additionalProperties: false,
        },
    }
};

export { calculatecarttotalTool };
