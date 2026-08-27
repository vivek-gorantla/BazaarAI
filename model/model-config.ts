import OpenAI from "openai";

// Azure AI Foundry – GPT-5.1
export const openai = new OpenAI({
    baseURL: process.env.OPENAI_ENDPOINT_URL || "https://25r11a05cm-8458-resource.services.ai.azure.com/openai/v1",
    apiKey: process.env.OPENAI_API_KEY,
    defaultHeaders: { "api-key": process.env.OPENAI_API_KEY ?? "" },
});

export const DEPLOYMENT = "gpt-5.1";

