const checkProductExistsTool = {
    type: "function" as const,
    name: "check_product_exists",
    description: "Check if a product exists in the database.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            productId: {
                type: "string",
                description: "Unique identifier of the product to check.",
            },
            storeId: {
                type: "string",
                description: "Optional store ID to check product existence within.",
            },
        },
        required: ["productId"],
        additionalProperties: false,
    },
};

export { checkProductExistsTool };