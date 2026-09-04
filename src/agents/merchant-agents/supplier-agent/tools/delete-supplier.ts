const deleteSupplierTool = {
    type: "function" as const,
    name: "delete_supplier",
    description: "Deletes a supplier from the database.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            supplierId: {
                type: "string",
                description: "Unique identifier of the supplier to delete.",
            },
        },
        required: ["supplierId"],
        additionalProperties: false,
    },
};

export { deleteSupplierTool };
