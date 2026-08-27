import { Schema, model, models } from "mongoose";
const RawImageCaptureSchema = new Schema({
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
    imageRef: {
        type: String,
        required: true,
    },
    visionExtraction: {
        type: Schema.Types.Mixed,
        required: true,
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
RawImageCaptureSchema.index({
    ownerId: 1,
    createdAt: -1,
});
RawImageCaptureSchema.index({
    storeId: 1,
    createdAt: -1,
});
const RawImageCapture = models.RawImageCapture ||
    model("RawImageCapture", RawImageCaptureSchema);
export default RawImageCapture;
