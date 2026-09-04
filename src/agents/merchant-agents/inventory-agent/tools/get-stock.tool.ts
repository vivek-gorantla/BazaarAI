const getStockTool = {
    type: "function" as const,
    name: "get_stock",
    description: "Retrieves the current stock level and details for a specific product.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            productId: {
                type: "string",
                description: "ID of the product to check stock for.",
            },
        },
        required: ["productId"],
        additionalProperties: false,
    },
};

export { getStockTool };
