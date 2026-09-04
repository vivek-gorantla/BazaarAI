const validatecartTool = {
    type: "function" as const,
    function: {
        name: "validate_cart",
        description: "Checks the items in the user's cart against current store inventory and active status to ensure they can be purchased.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    description: "The ID of the user whose cart should be validated.",
                },
            },
            required: ["userId"],
            additionalProperties: false,
        },
    }
};

export { validatecartTool };
