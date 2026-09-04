import { VoiceParser } from "./voiceParser.js";
import { imageParser } from "./imageParser.js";
import { parseCsvProducts } from "./csvParser.js";
import { textParser } from "./textParser.js";

export enum uploadType {
    IMAGE = "image",
    VOICE = "voice",
    CSV = "csv",
    TEXT = "text"
}

export interface data {
    imageUpload?: File | Blob | Buffer | string;
    voiceUpload?: Blob | Buffer | string;
    csv?: File | Blob | Buffer | string;
    text?: string;
}

export interface upload {
    merchantId?: string;
    uploadType: uploadType;
    data: data;
}

export class ParsingGateway {
    async Request(data: upload) {
        switch (data.uploadType) {
            case uploadType.IMAGE:
                if (!data.data.imageUpload) throw new Error("imageUpload data is required");
                return await imageParser(data.data.imageUpload);

            case uploadType.TEXT:
                if (data.data.text === undefined) throw new Error("text data is required");
                return textParser(data.data.text);

            case uploadType.CSV:
                if (!data.data.csv) throw new Error("csv data is required");
                return await parseCsvProducts(data.data.csv);

            case uploadType.VOICE:
                if (!data.data.voiceUpload) throw new Error("voiceUpload data is required");
                return await VoiceParser(data.data.voiceUpload as any);

            default:
                throw new Error("Invalid upload type");
        }
    }
}
