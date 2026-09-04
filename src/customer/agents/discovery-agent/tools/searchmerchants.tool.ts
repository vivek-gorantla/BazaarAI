const searchmerchantsTool = {
    type: "function" as const,
    function: {
        name: "search_merchants",
        description: "Search for merchants/stores based on location or a specific product they carry.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                location: {
                    type: "string",
                    description: "The city or location name to filter merchants by (optional).",
                },
                productId: {
                    type: "string",
                    description: "A specific product ID to find merchants that carry it (optional).",
                },
            },
            required: [],
            additionalProperties: false,
        },
    }
};

export { searchmerchantsTool };
