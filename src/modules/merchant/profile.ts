import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errors.js";

export async function getMerchantProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true, phone: true, preferredLanguage: true, createdAt: true, updatedAt: true },
  });
  if (!user || user.role !== "merchant") {
    throw new ApiError(404, "MERCHANT_NOT_FOUND", "Merchant not found");
  }
  return user;
}

export async function updateMerchantProfile(userId: string, body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_REQUEST", "Request body must be an object");
  }
  const input = body as Record<string, unknown>;
  const allowed = ["name", "preferredLanguage"];
  for (const field of Object.keys(input)) {
    if (!allowed.includes(field)) {
      throw new ApiError(400, "INVALID_REQUEST", `${field} cannot be updated`);
    }
    if (typeof input[field] !== "string" || input[field] === "") {
      throw new ApiError(400, "INVALID_REQUEST", `${field} must be a non-empty string`);
    }
  }
  if (Object.keys(input).length === 0) {
    throw new ApiError(400, "INVALID_REQUEST", "At least one profile field is required");
  }
  return prisma.user.update({
    where: { id: userId },
    data: { name: input.name as string | undefined, preferredLanguage: input.preferredLanguage as string | undefined },
    select: { id: true, role: true, name: true, phone: true, preferredLanguage: true, createdAt: true, updatedAt: true },
  });
}
