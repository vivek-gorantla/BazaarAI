import { Prisma } from "../../generated/prisma/client.js";
import RawVoiceCapture from "../../../models/RawVoiceCapture.js";
import RawImageCapture from "../../../models/RawImageCapture.js";
import { connectDatabase } from "../../../lib/db.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errors.js";
import { validateProduct } from "../catalog/validation.js";
import { mockExtractProducts, mockExtractProductsFromImage, mockTranscribeAudio } from "./mock.js";

async function ownedStore(storeId: string, ownerId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new ApiError(404, "STORE_NOT_FOUND", "Store not found");
  if (store.ownerId !== ownerId) throw new ApiError(403, "STORE_FORBIDDEN", "You do not own this store");
}

async function productsFromItems(items: unknown, source: "voice" | "image") {
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(422, "INVALID_CONFIRMATION", "At least one product is required");
  return items.map((item) => {
    const input = validateProduct(item, false);
    return { name: input.name as string, category: input.category as string, unit: input.unit as never, price: new Prisma.Decimal(input.price as number), stockQty: new Prisma.Decimal((input.stockQty as number | undefined) ?? 0), description: input.description as string | undefined, subcategory: input.subcategory as string | undefined, sku: input.sku as string | undefined, imageUrl: input.imageUrl as string | undefined, attributes: input.attributes as Prisma.InputJsonValue | undefined, source };
  });
}

async function createCaptureProducts(items: unknown, storeId: string, source: "voice" | "image") {
  const products = await productsFromItems(items, source);
  return prisma.$transaction(async (transaction) => Promise.all(products.map((product) => transaction.product.create({ data: { ...product, storeId } }))));
}

export async function createVoiceCapture(ownerId: string, storeId: string, audioRef: string) {
  await ownedStore(storeId, ownerId);
  await connectDatabase();
  const transcript = await mockTranscribeAudio();
  const extraction = mockExtractProducts(transcript);
  const capture = await RawVoiceCapture.create({ ownerId, storeId, audioRef, transcript, parsedItems: extraction.items, confidence: extraction.confidence });
  return formatCapture(capture);
}

export async function createImageCapture(ownerId: string, storeId: string, imageRef: string) {
  await ownedStore(storeId, ownerId);
  await connectDatabase();
  const extraction = await mockExtractProductsFromImage();
  const capture = await RawImageCapture.create({ ownerId, storeId, imageRef, visionExtraction: extraction });
  return formatCapture(capture);
}

export async function getVoiceCapture(ownerId: string, captureId: string) {
  await connectDatabase();
  const capture = await RawVoiceCapture.findById(captureId).lean();
  if (!capture) throw new ApiError(404, "CAPTURE_NOT_FOUND", "Voice capture not found");
  if (capture.ownerId !== ownerId) throw new ApiError(403, "CAPTURE_FORBIDDEN", "You do not own this capture");
  return formatCapture(capture);
}

export async function getImageCapture(ownerId: string, captureId: string) {
  await connectDatabase();
  const capture = await RawImageCapture.findById(captureId).lean();
  if (!capture) throw new ApiError(404, "CAPTURE_NOT_FOUND", "Image capture not found");
  if (capture.ownerId !== ownerId) throw new ApiError(403, "CAPTURE_FORBIDDEN", "You do not own this capture");
  return formatCapture(capture);
}

export async function confirmVoiceCapture(ownerId: string, captureId: string, items: unknown) {
  await connectDatabase();
  const capture = await RawVoiceCapture.findById(captureId).lean();
  if (!capture) throw new ApiError(404, "CAPTURE_NOT_FOUND", "Voice capture not found");
  if (capture.ownerId !== ownerId) throw new ApiError(403, "CAPTURE_FORBIDDEN", "You do not own this capture");
  if (capture.confirmed) throw new ApiError(409, "CAPTURE_ALREADY_CONFIRMED", "Capture has already been confirmed");
  const products = await createCaptureProducts(items, capture.storeId, "voice");
  await RawVoiceCapture.updateOne({ _id: captureId, confirmed: false }, { $set: { confirmed: true, confirmedAt: new Date() } });
  return products;
}

export async function confirmImageCapture(ownerId: string, captureId: string, items: unknown) {
  await connectDatabase();
  const capture = await RawImageCapture.findById(captureId).lean();
  if (!capture) throw new ApiError(404, "CAPTURE_NOT_FOUND", "Image capture not found");
  if (capture.ownerId !== ownerId) throw new ApiError(403, "CAPTURE_FORBIDDEN", "You do not own this capture");
  if (capture.confirmed) throw new ApiError(409, "CAPTURE_ALREADY_CONFIRMED", "Capture has already been confirmed");
  const products = await createCaptureProducts(items, capture.storeId, "image");
  await RawImageCapture.updateOne({ _id: captureId, confirmed: false }, { $set: { confirmed: true, confirmedAt: new Date() } });
  return products;
}

function formatCapture(capture: Record<string, unknown> & { _id?: unknown }) {
  return { ...capture, captureId: String(capture._id), _id: undefined };
}
