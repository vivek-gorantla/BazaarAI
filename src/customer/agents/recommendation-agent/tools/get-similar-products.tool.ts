const getSimilarProductsTool = {
    type: "function" as const,
    name: "get_similar_products",
    description: "Get similar or related products based on a given product ID.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            productId: {
                type: "string",
                description: "The unique identifier of the product.",
            },
            limit: {
                type: "number",
                description: "Maximum number of similar products to return. Default is 5.",
            },
        },
        required: ["productId"],
        additionalProperties: false,
    },
};

export { getSimilarProductsTool };
