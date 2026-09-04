const getLowStockTool = {
    type: "function" as const,
    name: "get_low_stock",
    description: "Retrieves products whose stock quantity is below a specified threshold.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            storeId: {
                type: "string",
                description: "ID of the store to check for low stock products.",
            },
            threshold: {
                type: "number",
                description: "Stock quantity threshold below which products are considered low stock (default is 10).",
            },
            limit: {
                type: "number",
                description: "Maximum number of low stock products to return.",
            },
        },
        required: [],
        additionalProperties: false,
    },
};

export { getLowStockTool };
