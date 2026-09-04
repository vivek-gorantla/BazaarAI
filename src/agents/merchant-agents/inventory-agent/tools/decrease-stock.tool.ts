const decreaseStockTool = {
    type: "function" as const,
    name: "decrease_stock",
    description: "Decreases the stock quantity of a product by deducting a specified amount.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            productId: {
                type: "string",
                description: "ID or Name of the product to decrease stock for (e.g. 'Wheat Flour' or product ID).",
            },
            quantity: {
                type: "number",
                description: "Quantity to deduct from the existing stock.",
            },
            reason: {
                type: "string",
                description: "Optional reason for decreasing stock (e.g., sale, damage, waste).",
            },
        },
        required: ["productId", "quantity"],
        additionalProperties: false,
    },
};

export { decreaseStockTool };
