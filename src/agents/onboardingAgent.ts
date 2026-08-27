import { openai, DEPLOYMENT } from "../../model/model-config.js";
import type { AgentUIContext } from "./types.js";

export interface FieldFill {
    fieldId: string;
    value: string;
}

const NUMBER_WORDS: Record<string, string> = {
    zero: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
};

/**
 * Fallback sanitizer to convert any remaining spoken number words ("one two three four")
 * into numeric digits ("1234") for code/ID/numeric fields.
 */
function sanitizeFieldValue(fieldId: string, value: string): string {
    if (!value) return value;

    let result = value.trim();

    const numericFieldKeywords = ["tax", "vat", "gst", "phone", "tel", "code", "pin", "pincode", "number", "account", "ifsc", "id", "ein"];
    const isCodeOrNumeric = numericFieldKeywords.some((kw) => fieldId.toLowerCase().includes(kw));

    if (isCodeOrNumeric) {
        const words = result.split(/\s+/);
        const convertedWords = words.map((w) => {
            const lower = w.toLowerCase().replace(/[^a-z0-9]/g, "");
            return NUMBER_WORDS[lower] !== undefined ? NUMBER_WORDS[lower] : w;
        });

        result = convertedWords.join(" ");
        // Compact space-separated single digits: "1 2 3 4" -> "1234"
        result = result.replace(/\b(\d)\s+(?=\d\b)/g, "$1");
    }

    return result;
}

/**
 * Given a transcription and the current page's UI context (fields schema),
 * calls GPT-5.1 to extract structured field values.
 * Returns an array of { fieldId, value } pairs for fields it is confident about.
 */
export async function extractFieldFills(
    transcription: string,
    uiContext: AgentUIContext
): Promise<FieldFill[]> {
    const fieldList = uiContext.fields
        .filter((f) => f.editable !== false)
        .map((f) => {
            const parts = [`- ${f.id} (${f.label}, type: ${f.type}`];
            if (f.required) parts.push(", required");
            if (f.description) parts.push(`, hint: ${f.description}`);
            if (f.options?.length) parts.push(`, options: ${f.options.join(" | ")}`);
            parts.push(")");
            return parts.join("");
        })
        .join("\n");

    const systemPrompt = `You are an AI assistant helping a merchant fill out an onboarding form.
The merchant has spoken their business details. Your job is to extract the relevant field values 
from their speech and return ONLY a valid JSON array — no markdown fences, no explanation, nothing else.

Fields to fill on the "${uiContext.pageTitle}" page:
${fieldList}

Rules:
- Only include fields where you are confident about the value from the speech.
- Skip fields that were not mentioned or are ambiguous.
- CRITICAL NUMERIC & CODE FORMATTING RULE:
  - Convert ALL spoken number words into actual digits! NEVER output number words like "one", "two", "three", "six".
    Examples:
    "one two three four" -> "1234"
    "six six" -> "66"
    "tax id one two three four" -> "1234"
    "GST one two three four five" -> "GST12345"
    "ninety eight seven six five" -> "98765"
  - For Tax IDs, VAT numbers, EIN, Phone numbers, Postal/Pin codes, Bank account numbers, and any numeric or ID fields:
    ALWAYS output digits ('0'-'9').
- EMAIL FORMATTING RULE:
  - Convert spoken emails (e.g. "hello at redbloom dot com") into standard email format "hello@redbloom.com".
- Output ONLY a JSON array in this exact format:
[{"fieldId":"fieldIdHere","value":"value here"},...]

If nothing relevant was said, output an empty array: []`;

    const userMessage = `Merchant's spoken input: "${transcription}"`;

    console.log(`[OnboardingAgent] Processing transcription for page: ${uiContext.pageId}`);
    console.log(`[OnboardingAgent] Fields schema: ${uiContext.fields.map((f) => f.id).join(", ")}`);

    const response = await openai.responses.create({
        model: DEPLOYMENT,
        input: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ],
    });

    // Extract text from the response — narrow the union type properly
    const rawText = response.output
        .filter((o) => o.type === "message" && "content" in o)
        .flatMap((o) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const content = (o as any).content as Array<{ type: string; text: string }>;
            return content.filter((c) => c.type === "output_text").map((c) => c.text);
        })
        .join("");

    console.log(`[OnboardingAgent] Raw GPT response: ${rawText}`);

    // Parse the JSON array
    const trimmed = rawText.trim();
    const jsonStart = trimmed.indexOf("[");
    const jsonEnd = trimmed.lastIndexOf("]");

    if (jsonStart === -1 || jsonEnd === -1) {
        console.warn("[OnboardingAgent] No JSON array found in response");
        return [];
    }

    const jsonSlice = trimmed.slice(jsonStart, jsonEnd + 1);
    const fills: FieldFill[] = JSON.parse(jsonSlice);

    // Validate structure & sanitize values
    const valid = fills
        .filter((f) => typeof f.fieldId === "string" && typeof f.value === "string")
        .map((f) => ({
            fieldId: f.fieldId,
            value: sanitizeFieldValue(f.fieldId, f.value),
        }));

    console.log(`[OnboardingAgent] Extracted ${valid.length} field fills:`, valid);
    return valid;
}
