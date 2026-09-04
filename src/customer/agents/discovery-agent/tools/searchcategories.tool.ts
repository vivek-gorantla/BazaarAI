const searchcategoriesTool = {
    type: "function" as const,
    function: {
        name: "search_categories",
        description: "Retrieve a list of all distinct product categories available in active stores. Useful for vague requests like 'things for a birthday party'.",
        strict: false,
        parameters: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
        },
    }
};

export { searchcategoriesTool };
