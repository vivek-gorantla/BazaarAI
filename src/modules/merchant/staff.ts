import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errors.js";

async function ownedStore(storeId: string, ownerId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new ApiError(404, "STORE_NOT_FOUND", "Store not found");
  if (store.ownerId !== ownerId) throw new ApiError(403, "STORE_FORBIDDEN", "You do not own this store");
  return store;
}

export async function inviteStaff(storeId: string, ownerId: string, body: any) {
  await ownedStore(storeId, ownerId);
  if (!body.name || !body.phone || !body.role) {
    throw new ApiError(400, "INVALID_INPUT", "Name, phone, and role are required");
  }
  
  return prisma.storeStaff.create({
    data: {
      storeId,
      name: body.name,
      phone: body.phone,
      role: body.role,
      status: "pending"
    }
  });
}

export async function listStaff(storeId: string, ownerId: string) {
  await ownedStore(storeId, ownerId);
  return prisma.storeStaff.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" }
  });
}

export async function removeStaff(storeId: string, staffId: string, ownerId: string) {
  await ownedStore(storeId, ownerId);
  await prisma.storeStaff.delete({
    where: { id: staffId, storeId }
  });
  return { message: "Staff removed successfully" };
}
