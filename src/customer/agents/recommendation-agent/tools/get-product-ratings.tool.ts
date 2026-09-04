const getProductRatingsTool = {
    type: "function" as const,
    name: "get_product_ratings",
    description: "Get average ratings and reviews for a product.",
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

export { getProductRatingsTool };
