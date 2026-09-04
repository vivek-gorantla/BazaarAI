const getproductTool = {
    type: "function" as const,
    function: {
        name: "get_product",
        description: "Retrieve detailed information for a specific product using its canonical ID.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                productId: {
                    type: "string",
                    description: "The canonical UUID of the product.",
                },
            },
            required: ["productId"],
            additionalProperties: false,
        },
    }
};

export { getproductTool };
