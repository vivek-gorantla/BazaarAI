const updateProductTool = {
    type: "function" as const,
    name: "update_product",
    description: "Updates an existing product in the database for a specific store.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            productId: {
                type: "string",
                description: "Unique identifier of the product to update.",
            },
            storeId: {
                type: "string",
                description: "ID of the store the product belongs to.",
            },
            name: {
                type: "string",
                description: "Updated name of the product.",
            },
            description: {
                type: "string",
                description: "Updated description of the product.",
            },
            category: {
                type: "string",
                description: "Updated category of the product.",
            },
            subcategory: {
                type: "string",
                description: "Updated subcategory of the product.",
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
                description: "Updated unit of measurement for the product.",
            },
            price: {
                type: "number",
                description: "Updated price of the product.",
            },
            stockQty: {
                type: "number",
                description: "Updated stock quantity of the product.",
            },
            sku: {
                type: "string",
                description: "Updated SKU or barcode of the product.",
            },
            imageUrl: {
                type: "string",
                description: "Updated image URL of the product.",
            },
            attributes: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "Name of the attribute",
                        },
                        value: {
                            type: "string",
                            description: "Value of the attribute",
                        },
                    },
                    required: ["name", "value"],
                    additionalProperties: false,
                },
                description: "Updated key-value attributes of the product.",
            },
            source: {
                type: "string",
                enum: ["voice", "image", "excel", "manual"],
                description: "Source from which the update is initiated.",
            },
            isActive: {
                type: "boolean",
                description: "Updated active status of the product.",
            },
        },
        required: ["productId", "storeId"],
        additionalProperties: false,
    },
};

export { updateProductTool };
