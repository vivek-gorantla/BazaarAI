const calculateFinalPriceTool = {
    type: "function" as const,
    name: "calculate_final_price",
    description: "Calculate the final price including taxes and delivery fees for a cart.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            itemsTotal: {
                type: "number",
                description: "The total price of the items in the cart.",
            },
        },
        required: ["itemsTotal"],
        additionalProperties: false,
    },
};

export { calculateFinalPriceTool };
