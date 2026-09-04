const checkavailabilityTool = {
    type: "function" as const,
    function: {
        name: "check_availability",
        description: "Check if a specific store has enough stock of a product to fulfill a quantity.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                productId: {
                    type: "string",
                    description: "The canonical UUID of the product.",
                },
                storeId: {
                    type: "string",
                    description: "The UUID of the store carrying the product.",
                },
                quantity: {
                    type: "number",
                    description: "The desired quantity.",
                },
            },
            required: ["productId", "storeId", "quantity"],
            additionalProperties: false,
        },
    }
};

export { checkavailabilityTool };
