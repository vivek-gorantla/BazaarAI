const increaseStockTool = {
    type: "function" as const,
    name: "increase_stock",
    description: "Increases the stock quantity of a product by adding a specified amount.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            productId: {
                type: "string",
                description: "ID or Name of the product to increase stock for (e.g. 'Basmati Rice' or product ID).",
            },
            quantity: {
                type: "number",
                description: "Quantity to add to the existing stock.",
            },
            reason: {
                type: "string",
                description: "Optional reason for increasing stock (e.g., restock, return).",
            },
        },
        required: ["productId", "quantity"],
        additionalProperties: false,
    },
};

export { increaseStockTool };
