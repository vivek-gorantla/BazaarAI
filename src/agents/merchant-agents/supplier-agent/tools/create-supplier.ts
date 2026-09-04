const createSupplierTool = {
    type: "function" as const,
    name: "create_supplier",
    description: "Creates a new supplier in the database.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Full name or primary contact name of the supplier.",
            },
            phone: {
                type: "string",
                description: "Primary phone number of the supplier.",
            },
            companyName: {
                type: "string",
                description: "Company or business name of the supplier.",
            },
            email: {
                type: "string",
                description: "Email address of the supplier.",
            },
            category: {
                type: "string",
                description: "Category of products supplied (e.g., Grocery, Electronics, Dairy).",
            },
            address: {
                type: "string",
                description: "Street address of the supplier.",
            },
            city: {
                type: "string",
                description: "City of the supplier.",
            },
            state: {
                type: "string",
                description: "State of the supplier.",
            },
            pincode: {
                type: "string",
                description: "Postal pincode of the supplier.",
            },
            gstin: {
                type: "string",
                description: "GSTIN / tax identifier of the supplier.",
            },
            paymentTerms: {
                type: "string",
                description: "Payment terms (e.g., Net 30, Advance, COD).",
            },
        },
        required: ["name", "phone"],
        additionalProperties: false,
    },
};

export { createSupplierTool };
