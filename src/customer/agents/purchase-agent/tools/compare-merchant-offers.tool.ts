const compareMerchantOffersTool = {
    type: "function" as const,
    name: "compare_merchant_offers",
    description: "Compare quotes from multiple merchants for the same basket of items.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            quotes: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        merchantId: { type: "string" },
                        totalPrice: { type: "number" },
                        deliveryTimeMinutes: { type: "number" },
                    },
                },
                description: "List of quotes to compare.",
            },
        },
        required: ["quotes"],
        additionalProperties: false,
    },
};

export { compareMerchantOffersTool };
