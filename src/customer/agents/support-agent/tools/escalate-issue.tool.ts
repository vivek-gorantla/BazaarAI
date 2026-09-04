const escalateIssueTool = {
    type: "function" as const,
    name: "escalate_issue",
    description: "Escalate an issue to human support.",
    strict: false,
    parameters: {
        type: "object",
        properties: {
            reason: {
                type: "string",
                description: "The reason for escalation.",
            },
        },
        required: ["reason"],
        additionalProperties: false,
    },
};

export { escalateIssueTool };
