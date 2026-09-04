export const createCrossSellTool = {
    type: "function" as const,
    name: "create_cross_sell",
    description: "Configures cross-selling by linking complementary products to a primary product.",
    strict: true,
    parameters: {
        type: "object",
        properties: {
            storeId: { type: "string", description: "ID of the store" },
            primaryProductId: { type: "string", description: "ID of the primary product" },
            complementaryProductIds: { 
                type: "array", 
                items: { type: "string" },
                description: "Array of product IDs that should be suggested when buying the primary product" 
            }
        },
        required: ["storeId", "primaryProductId", "complementaryProductIds"],
        additionalProperties: false
    }
};
