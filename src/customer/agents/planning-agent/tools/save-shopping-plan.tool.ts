const saveShoppingPlanTool = {
    type: "function" as const,
    name: "save_shopping_plan",
    description: "Save or update a customer's shopping plan.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            customerId: {
                type: "string",
                description: "The unique identifier of the customer.",
            },
            planDetails: {
                type: "string",
                description: "JSON string containing the plan.",
            },
        },
        required: ["customerId", "planDetails"],
        additionalProperties: false,
    },
};

export { saveShoppingPlanTool };
