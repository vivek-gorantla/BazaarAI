const getOutOfStockTool = {
    type: "function" as const,
    name: "get_out_of_stock",
    description: "Retrieves products that are currently completely out of stock (stock quantity = 0).",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            storeId: {
                type: "string",
                description: "ID of the store to check for out of stock products.",
            },
            limit: {
                type: "number",
                description: "Maximum number of out of stock products to return.",
            },
        },
        required: [],
        additionalProperties: false,
    },
};

export { getOutOfStockTool };
