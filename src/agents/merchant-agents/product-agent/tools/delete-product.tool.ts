const deleteProductTool = {
    type: "function" as const,
    name: "delete_product",
    description: "Deletes a product from the database for a specific store.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            productId: {
                type: "string",
                description: "ID, SKU, or Name of the product to delete.",
            },
            storeId: {
                type: "string",
                description: "Optional store ID the product belongs to.",
            },
        },
        required: ["productId"],
        additionalProperties: false,
    },
};

export { deleteProductTool };