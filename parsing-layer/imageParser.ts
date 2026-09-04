import { z } from "zod";
import { openai, DEPLOYMENT } from "../model/model-config.js";
import { systemprompt } from "./imagePrompt.js";
import { zodResponseFormat } from "openai/helpers/zod";

export const imageParserSchema = z.object({
    imageType: z.string(),

    objects: z.array(
        z.object({
            name: z.string(),
            description: z.string(),
            category: z.string(),
            brand: z.string().nullable(),

            attributes: z.array(
                z.object({
                    name: z.string(),
                    value: z.string(),
                })
            ),

            text: z.array(z.string()),

            quantity: z.number().nullable(),

            confidence: z.number().min(0).max(1),
        })
    ),

    overallDescription: z.string(),

    warnings: z.array(z.string()),
});

export type ImageParserResult =
    z.infer<typeof imageParserSchema>;



async function imageToBase64DataUrl(image: any): Promise<string> {
    if (!image) throw new Error("No image input provided");

    if (typeof image === "string") {
        if (image.startsWith("data:") || image.startsWith("http://") || image.startsWith("https://")) {
            return image;
        }
        return `data:image/jpeg;base64,${image}`;
    }

    if (Buffer.isBuffer(image)) {
        return `data:image/jpeg;base64,${image.toString("base64")}`;
    }

    if (typeof image === "object" && image.type === "Buffer" && Array.isArray(image.data)) {
        const buf = Buffer.from(image.data);
        return `data:image/jpeg;base64,${buf.toString("base64")}`;
    }

    if (typeof image === "object" && image.buffer && Buffer.isBuffer(image.buffer)) {
        return `data:image/jpeg;base64,${image.buffer.toString("base64")}`;
    }

    if (typeof image === "object" && typeof image.arrayBuffer === "function") {
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = image.type || "image/jpeg";
        return `data:${mimeType};base64,${buffer.toString("base64")}`;
    }

    throw new Error(`Unsupported image data format`);
}

export async function imageParser(image: File | Blob | Buffer | string): Promise<ImageParserResult> {
    const imageUrl = await imageToBase64DataUrl(image);

    const response = await openai.chat.completions.parse({
        model: DEPLOYMENT,
        messages: [
            { role: "system", content: systemprompt },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Analyze this image and describe what is visible according to the system prompt."
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: imageUrl,
                            detail: "auto"
                        }
                    }
                ]
            }
        ],
        response_format: zodResponseFormat(imageParserSchema, "image_parser"),
    });

    const message = response.choices[0]?.message;
    if (message?.refusal) throw new Error(`Request refused: ${message.refusal}`);
    if (!message?.parsed) throw new Error("The response wasn't parsed.");
    return message.parsed;
}