const addtocartTool = {
    type: "function" as const,
    function: {
        name: "add_to_cart",
        description: "Adds a specified quantity of a product to the user's cart.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    description: "The ID of the user adding to the cart.",
                },
                productId: {
                    type: "string",
                    description: "The ID of the product to add.",
                },
                storeId: {
                    type: "string",
                    description: "The ID of the store the product belongs to.",
                },
                quantity: {
                    type: "number",
                    description: "The quantity to add to the cart.",
                },
            },
            required: ["userId", "productId", "storeId", "quantity"],
            additionalProperties: false,
        },
    }
};

export { addtocartTool };
