const getCustomerPreferencesTool = {
    type: "function" as const,
    name: "get_customer_preferences",
    description: "Get preferences for a specific customer (e.g. dietary requirements, language, etc). Returns basic/mocked preferences if not set.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            customerId: {
                type: "string",
                description: "The unique identifier of the customer.",
            },
        },
        required: ["customerId"],
        additionalProperties: false,
    },
};

export { getCustomerPreferencesTool };
