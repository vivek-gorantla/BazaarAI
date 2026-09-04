const requestMerchantQuoteTool = {
    type: "function" as const,
    name: "request_merchant_quote",
    description: "Request a quote (price, availability) from a merchant for a list of products.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            merchantId: {
                type: "string",
                description: "The unique identifier of the merchant.",
            },
            items: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        productId: { type: "string" },
                        qty: { type: "number" },
                    },
                },
                description: "List of items to request quote for.",
            },
        },
        required: ["merchantId", "items"],
        additionalProperties: false,
    },
};

export { requestMerchantQuoteTool };
