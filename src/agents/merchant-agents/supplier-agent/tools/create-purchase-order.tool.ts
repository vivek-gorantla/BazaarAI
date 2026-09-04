const createPurchaseOrderTool = {
    type: "function" as const,
    name: "create_purchase_order",
    description: "Creates a purchase order (PO) for a supplier.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            storeId: {
                type: "string",
                description: "ID of the store creating the purchase order.",
            },
            supplierId: {
                type: "string",
                description: "ID of the supplier receiving the purchase order.",
            },
            items: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        productId: {
                            type: "string",
                            description: "ID of the store product (if existing).",
                        },
                        supplierProductId: {
                            type: "string",
                            description: "ID of the supplier product (if existing).",
                        },
                        name: {
                            type: "string",
                            description: "Name of the item.",
                        },
                        qty: {
                            type: "number",
                            description: "Quantity of the item to order.",
                        },
                        unitPrice: {
                            type: "number",
                            description: "Unit price of the item.",
                        },
                    },
                    required: ["name", "qty", "unitPrice"],
                    additionalProperties: false,
                },
                description: "List of items in the purchase order.",
            },
            notes: {
                type: "string",
                description: "Optional notes for the purchase order.",
            },
            expectedDelivery: {
                type: "string",
                description: "Expected delivery date string (ISO format or YYYY-MM-DD).",
            },
        },
        required: ["storeId", "supplierId", "items"],
        additionalProperties: false,
    },
};

export { createPurchaseOrderTool };
