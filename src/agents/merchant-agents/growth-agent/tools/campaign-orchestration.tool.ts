export const campaignOrchestrationTool = {
    type: "function" as const,
    name: "campaign_orchestration",
    description: "Orchestrates a campaign by applying a discount percentage to products matching a category or query.",
    strict: true,
    parameters: {
        type: "object",
        properties: {
            storeId: { type: "string", description: "ID of the store" },
            query: { type: ["string", "null"], description: "Optional text query to match product names (e.g., 'milk')" },
            category: { type: ["string", "null"], description: "Optional category to match (e.g., 'Dairy')" },
            discountPercentage: { type: "number", description: "Discount percentage to apply (e.g., 10 for 10%)" },
            campaignName: { type: "string", description: "Name of the campaign (e.g., 'Weekend Sale')" }
        },
        required: ["storeId", "query", "category", "discountPercentage", "campaignName"],
        additionalProperties: false
    }
};
