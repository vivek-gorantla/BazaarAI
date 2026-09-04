const updateSupplierTool = {
    type: "function" as const,
    name: "update_supplier",
    description: "Updates an existing supplier's details in the database.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            supplierId: {
                type: "string",
                description: "Unique identifier of the supplier to update.",
            },
            name: {
                type: "string",
                description: "Updated full name or contact name.",
            },
            phone: {
                type: "string",
                description: "Updated phone number.",
            },
            companyName: {
                type: "string",
                description: "Updated company name.",
            },
            email: {
                type: "string",
                description: "Updated email address.",
            },
            category: {
                type: "string",
                description: "Updated supplier category.",
            },
            address: {
                type: "string",
                description: "Updated street address.",
            },
            city: {
                type: "string",
                description: "Updated city.",
            },
            state: {
                type: "string",
                description: "Updated state.",
            },
            pincode: {
                type: "string",
                description: "Updated postal pincode.",
            },
            gstin: {
                type: "string",
                description: "Updated GSTIN.",
            },
            paymentTerms: {
                type: "string",
                description: "Updated payment terms.",
            },
        },
        required: ["supplierId"],
        additionalProperties: false,
    },
};

export { updateSupplierTool };
