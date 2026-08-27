import { Schema, model, models } from "mongoose";
const ParsedItemSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    qty: {
        type: Number,
        required: true,
        min: 0,
    },
    unit: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        min: 0,
    },
}, { _id: false });
const RawVoiceCaptureSchema = new Schema({
    ownerId: {
        type: String,
        required: true,
        index: true,
    },
    storeId: {
        type: String,
        required: true,
        index: true,
    },
    audioRef: {
        type: String,
    },
    transcript: {
        type: String,
        trim: true,
    },
    parsedItems: {
        type: [ParsedItemSchema],
        default: [],
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
    },
    confirmed: {
        type: Boolean,
        default: false,
        index: true,
    },
    confirmedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
RawVoiceCaptureSchema.index({
    ownerId: 1,
    createdAt: -1,
});
RawVoiceCaptureSchema.index({
    storeId: 1,
    createdAt: -1,
});
const RawVoiceCapture = models.RawVoiceCapture ||
    model("RawVoiceCapture", RawVoiceCaptureSchema);
export default RawVoiceCapture;
