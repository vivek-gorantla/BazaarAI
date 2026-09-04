const removefromcartTool = {
    type: "function" as const,
    function: {
        name: "remove_from_cart",
        description: "Removes a specific product from the user's cart entirely.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    description: "The ID of the user removing the item.",
                },
                productId: {
                    type: "string",
                    description: "The ID of the product to remove.",
                },
                storeId: {
                    type: "string",
                    description: "The ID of the store the product belongs to.",
                },
            },
            required: ["userId", "productId", "storeId"],
            additionalProperties: false,
        },
    }
};

export { removefromcartTool };