const getInventoryHistoryTool = {
    type: "function" as const,
    name: "get_inventory_history",
    description: "Retrieves historical log of stock changes for a product or store.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            productId: {
                type: "string",
                description: "Filter inventory history by specific product ID.",
            },
            storeId: {
                type: "string",
                description: "Filter inventory history by store ID.",
            },
            limit: {
                type: "number",
                description: "Maximum number of log entries to return.",
            },
        },
        required: [],
        additionalProperties: false,
    },
};

export { getInventoryHistoryTool };
