const setStockTool = {
    type: "function" as const,
    name: "set_stock",
    description: "Sets the exact stock quantity for a product in the database.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            productId: {
                type: "string",
                description: "ID or Name of the product whose stock is being updated (e.g. 'Basmati Rice' or product ID).",
            },
            stockQty: {
                type: "number",
                description: "Exact stock quantity to set.",
            },
            reason: {
                type: "string",
                description: "Optional reason for setting the stock quantity.",
            },
        },
        required: ["productId", "stockQty"],
        additionalProperties: false,
    },
};

export { setStockTool };
