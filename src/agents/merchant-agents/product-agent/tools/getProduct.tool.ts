const getProductTool = {
    type: "function" as const,
    name: "get_product",
    description: "Get a product from the database.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            productId: {
                type: "string",
                description: "ID of the product to get.",
            },
            storeId: {
                type: "string",
                description: "Optional store ID to filter the product.",
            },
        },
        required: ["productId"],
        additionalProperties: false,
    },
};

export { getProductTool };