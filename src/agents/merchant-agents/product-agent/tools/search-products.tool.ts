const searchProductsTool = {
    type: "function" as const,
    name: "search_products",
    description: "Search for products in the database using any optional filter criteria.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Search text query matching product name, description, or category.",
            },
            storeId: {
                type: "string",
                description: "Filter products by store ID.",
            },
            category: {
                type: "string",
                description: "Filter products by category.",
            },
            subcategory: {
                type: "string",
                description: "Filter products by subcategory.",
            },
            unit: {
                type: "string",
                enum: [
                    "kg",
                    "gram",
                    "tonne",
                    "litre",
                    "ml",
                    "meter",
                    "cm",
                    "pack",
                    "box",
                    "pair",
                    "piece",
                    "set",
                    "dozen",
                    "bottle",
                    "other",
                ],
                description: "Filter products by unit of measurement.",
            },
            minPrice: {
                type: "number",
                description: "Filter products with price greater than or equal to this value.",
            },
            maxPrice: {
                type: "number",
                description: "Filter products with price less than or equal to this value.",
            },
            sku: {
                type: "string",
                description: "Filter products by SKU or barcode.",
            },
            source: {
                type: "string",
                enum: ["voice", "image", "excel", "manual"],
                description: "Filter products by creation source.",
            },
            isActive: {
                type: "boolean",
                description: "Filter products by active status.",
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
