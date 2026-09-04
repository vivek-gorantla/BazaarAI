import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function VoiceParser(data: Blob | Buffer | File | any) {
    const elevenLabsClient = new ElevenLabsClient({ apiKey: process.env.ELEVEN_LABS_API_KEY });
    const transcription = await elevenLabsClient.speechToText.convert({
        file: data,
        modelId: "scribe_v2",
        tagAudioEvents: true, // Tag audio events like laughter, applause, etc.
        // languageCode: null, // Language of the audio file. If set to null, the model will detect the language automatically.
        diarize: true, // Whether to annotate who is speaking
    });
    return transcription.text;
}