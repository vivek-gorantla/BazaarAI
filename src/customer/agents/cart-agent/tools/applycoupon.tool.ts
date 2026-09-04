const applycouponTool = {
    type: "function" as const,
    function: {
        name: "apply_coupon",
        description: "Applies a discount coupon to the user's cart and returns the updated total.",
        strict: false,
        parameters: {
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    description: "The ID of the user applying the coupon.",
                },
                couponCode: {
                    type: "string",
                    description: "The coupon code to apply (e.g., WELCOME10, FLAT50).",
                },
            },
            required: ["userId", "couponCode"],
            additionalProperties: false,
        },
    }
};

export { applycouponTool };
