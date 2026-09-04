const updatecartitemTool = {
    type: "function" as const,
    function: {
        name: "update_cart_item",
        description: "Updates the quantity of a specific product in the user's cart.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    description: "The ID of the user updating their cart.",
                },
                productId: {
                    type: "string",
                    description: "The ID of the product to update.",
                },
                storeId: {
                    type: "string",
                    description: "The ID of the store the product belongs to.",
                },
                quantity: {
                    type: "number",
                    description: "The new quantity for the cart item. Setting it to 0 removes the item.",
                },
            },
            required: ["userId", "productId", "storeId", "quantity"],
            additionalProperties: false,
        },
    }
};

export { updatecartitemTool };
