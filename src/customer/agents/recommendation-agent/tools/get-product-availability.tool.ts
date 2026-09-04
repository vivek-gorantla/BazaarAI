const getProductAvailabilityTool = {
    type: "function" as const,
    name: "get_product_availability",
    description: "Check if a product is available in stock and get its quantity.",
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

export { getProductAvailabilityTool };
