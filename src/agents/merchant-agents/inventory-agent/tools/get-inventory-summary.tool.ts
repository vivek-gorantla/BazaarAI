const getInventorySummaryTool = {
    type: "function" as const,
    name: "get_inventory_summary",
    description: "Retrieves a summary overview of the store's inventory status.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            storeId: {
                type: "string",
                description: "ID of the store to get inventory summary for.",
            },
        },
        required: [],
        additionalProperties: false,
    },
};

export { getInventorySummaryTool };
