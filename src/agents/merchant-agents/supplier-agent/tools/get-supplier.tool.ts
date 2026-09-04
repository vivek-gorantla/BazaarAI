const getSupplierTool = {
    type: "function" as const,
    name: "get_supplier",
    description: "Retrieves details of a specific supplier including their product catalog.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            supplierId: {
                type: "string",
                description: "Unique identifier of the supplier to get.",
            },
        },
        required: ["supplierId"],
        additionalProperties: false,
    },
};

export { getSupplierTool };
