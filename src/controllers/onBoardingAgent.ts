import { Request, Response } from "express";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";


const client = new ElevenLabsClient({ apiKey: process.env.ELEVEN_LABS_API_KEY || process.env.ELEVENLABS_API_KEY });

export const uploadAudio = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
        res.status(400).json({ success: false, message: "No audio file provided." });
        return;
    }

    try {
        const audioBlob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });

        const response = await client.speechToText.convert({
            modelId: "scribe_v2",
            file: audioBlob,
        });

        const transcription = response.text;
        console.log("[VoiceAgent] Transcription:", transcription);

        res.status(200).json({
            success: true,
            transcription: transcription,
            message: "Successfully processed voice input."
        });
    } catch (error) {
        console.error("[VoiceAgent] Transcription error:", error);
        res.status(500).json({ success: false, message: "Failed to transcribe audio." });
    }
};