const getSupplierOrdersTool = {
    type: "function" as const,
    name: "get_supplier_orders",
    description: "Retrieves purchase orders filtered by store, supplier, or status.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            storeId: {
                type: "string",
                description: "Filter purchase orders by store ID.",
            },
            supplierId: {
                type: "string",
                description: "Filter purchase orders by supplier ID.",
            },
            status: {
                type: "string",
                enum: ["draft", "sent", "confirmed", "shipped", "received", "cancelled"],
                description: "Filter purchase orders by status.",
            },
            limit: {
                type: "number",
                description: "Maximum number of purchase orders to return.",
            },
        },
        required: [],
        additionalProperties: false,
    },
};

export { getSupplierOrdersTool };
