const getProductTool = {
    type: "function" as const,
    name: "get_product",
    description: "Get detailed information about a specific product.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            productId: {
                type: "string",
                description: "The unique identifier of the product.",
            },
        },
        required: ["productId"],
        additionalProperties: false,
    },
};

export { getProductTool };
