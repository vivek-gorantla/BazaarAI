const searchSuppliersTool = {
    type: "function" as const,
    name: "search_suppliers",
    description: "Search and filter suppliers in the database using optional criteria.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Search term matching supplier name, company name, or category.",
            },
            category: {
                type: "string",
                description: "Filter by supplier category.",
            },
            city: {
                type: "string",
                description: "Filter by city.",
            },
            limit: {
                type: "number",
                description: "Maximum number of suppliers to return.",
            },
        },
        required: [],
        additionalProperties: false,
    },
};

export { searchSuppliersTool };
