const getcartTool = {
    type: "function" as const,
    function: {
        name: "get_cart",
        description: "Retrieves all items currently in the user's cart.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    description: "The ID of the user whose cart to retrieve.",
                },
            },
            required: ["userId"],
            additionalProperties: false,
        },
    }
};

export { getcartTool };
