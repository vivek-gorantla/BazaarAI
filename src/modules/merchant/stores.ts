import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errors.js";
import { validateCreateStore, validateUpdateStore } from "./validation.js";

const storeFields = ["name", "description", "businessType", "address", "city", "state", "pincode", "lat", "lng", "legalName", "tradingName", "taxId", "vatNumber", "businessEmail", "supportPhone", "bannerUrl", "logoUrl", "themeColor", "unit", "deliveryEnabled", "deliveryRadius", "bankAccountNumber", "bankIfsc", "upiId"] as const;

async function ownedStore(storeId: string, ownerId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new ApiError(404, "STORE_NOT_FOUND", "Store not found");
  if (store.ownerId !== ownerId) throw new ApiError(403, "STORE_FORBIDDEN", "You do not own this store");
  return store;
}

export async function createStore(ownerId: string, body: unknown) {
  const input = validateCreateStore(body);
  return prisma.store.create({
    data: {
      ownerId,
      name: input.name as string,
      businessType: input.businessType as string,
      address: input.address as string,
      lat: input.lat as number,
      lng: input.lng as number,
      description: input.description as string | undefined,
      city: input.city as string | undefined,
      state: input.state as string | undefined,
      pincode: input.pincode as string | undefined,
      legalName: input.legalName as string | undefined,
      tradingName: input.tradingName as string | undefined,
      taxId: input.taxId as string | undefined,
      vatNumber: input.vatNumber as string | undefined,
      businessEmail: input.businessEmail as string | undefined,
      supportPhone: input.supportPhone as string | undefined,
    },
  });
}

export async function listStores(ownerId: string) {
  return prisma.store.findMany({
    where: { ownerId },
    include: { _count: { select: { products: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function getStore(storeId: string, ownerId: string) {
  return ownedStore(storeId, ownerId);
}

export async function updateStore(storeId: string, ownerId: string, body: unknown) {
  await ownedStore(storeId, ownerId);
  const input = validateUpdateStore(body);
  const data = Object.fromEntries(
    storeFields.filter((field) => input[field] !== undefined).map((field) => [field, input[field]])
  );
  return prisma.store.update({ where: { id: storeId }, data });
}
