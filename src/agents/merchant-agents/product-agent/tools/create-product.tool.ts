const createProductTool = {
    type: "function" as const,
    name: "create_product",
    description: "Creates a new product in the database.",
    strict: true,
    parameters: {
        type: "object",
        properties: {
            storeId: {
                type: "string",
                description: "ID of the store where the product will be created.",
            },
            name: {
                type: "string",
                description: "Name of the product.",
            },
            description: {
                type: "string",
                description: "Description of the product.",
            },
            category: {
                type: "string",
                description: "Category of the product.",
            },
            subcategory: {
                type: "string",
                description: "Subcategory of the product.",
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
                description: "Unit of measurement for the product.",
            },
            price: {
                type: "number",
                description: "Price of the product.",
            },
            stockQty: {
                type: "number",
                description: "Stock quantity of the product.",
            },
            sku: {
                type: "string",
                description: "SKU or barcode of the product.",
            },
            imageUrl: {
                type: "string",
                description: "Image URL of the product.",
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
                description: "Attributes of the product.",
            },
            source: {
                type: "string",
                enum: ["voice", "image", "excel", "manual"],
                description: "Source from which the product is created.",
            },
            isActive: {
                type: "boolean",
                description: "Whether the product is active.",
            },
        },
        required: [
            "storeId",
            "name",
            "description",
            "category",
            "subcategory",
            "unit",
            "price",
            "stockQty",
            "sku",
            "imageUrl",
            "attributes",
            "source",
            "isActive",
        ],
        additionalProperties: false,
    },
};

export { createProductTool };