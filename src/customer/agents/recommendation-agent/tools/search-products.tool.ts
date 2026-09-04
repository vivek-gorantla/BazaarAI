const searchProductsTool = {
    type: "function" as const,
    name: "search_products",
    description: "Search for products in the database using filters. Useful for finding what's available.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Search text query matching product name, description, or category.",
            },
            category: {
                type: "string",
                description: "Filter products by category.",
            },
            subcategory: {
                type: "string",
                description: "Filter products by subcategory.",
            },
            minPrice: {
                type: "number",
                description: "Filter products with price greater than or equal to this value.",
            },
            maxPrice: {
                type: "number",
                description: "Filter products with price less than or equal to this value.",
            },
            limit: {
                type: "number",
                description: "Maximum number of products to return.",
            },
        },
        required: [],
        additionalProperties: false,
    },
};

export { searchProductsTool };
