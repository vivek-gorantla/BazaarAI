const searchproductsTool = {
    type: "function" as const,
    function: {
        name: "search_products",
        description: "Search the product catalog for items matching the customer's request.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The name, category, or keyword to search for (e.g., 'basmati rice').",
                },
            },
            required: ["query"],
            additionalProperties: false,
        },
    }
};

export { searchproductsTool };
