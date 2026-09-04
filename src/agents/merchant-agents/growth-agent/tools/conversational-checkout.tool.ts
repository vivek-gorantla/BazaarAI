export const conversationalCheckoutTool = {
    type: "function" as const,
    name: "conversational_checkout",
    description: "Processes a point-of-sale checkout for a walk-in customer conversationally.",
    strict: true,
    parameters: {
        type: "object",
        properties: {
            storeId: { type: "string", description: "ID of the store" },
            customerPhone: { type: ["string", "null"], description: "Optional phone number of the customer for loyalty tracking" },
            items: { 
                type: "array", 
                items: { 
                    type: "object",
                    properties: {
                        productId: { type: "string" },
                        qty: { type: "number" }
                    },
                    required: ["productId", "qty"],
                    additionalProperties: false
                },
                description: "List of products and quantities to checkout"
            },
            paymentMethod: { type: "string", enum: ["cash", "card", "upi"], description: "Method of payment used" }
        },
        required: ["storeId", "customerPhone", "items", "paymentMethod"],
        additionalProperties: false
    }
};
