export const createUpsellTool = {
    type: "function" as const,
    name: "create_upsell",
    description: "Configures an upsell by linking a base product to a premium product.",
    strict: true,
    parameters: {
        type: "object",
        properties: {
            storeId: { type: "string", description: "ID of the store" },
            baseProductId: { type: "string", description: "ID of the base product the customer is viewing" },
            premiumProductId: { type: "string", description: "ID of the premium product to upsell them to" }
        },
        required: ["storeId", "baseProductId", "premiumProductId"],
        additionalProperties: false
    }
};
