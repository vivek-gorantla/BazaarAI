import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errors.js";
import { validateProduct, validateStock } from "./validation.js";

async function ownedProduct(productId: string, ownerId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { store: true } });
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");
  if (product.store.ownerId !== ownerId) throw new ApiError(403, "PRODUCT_FORBIDDEN", "You do not own this product");
  return product;
}

async function ownedStore(storeId: string, ownerId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new ApiError(404, "STORE_NOT_FOUND", "Store not found");
  if (store.ownerId !== ownerId) throw new ApiError(403, "STORE_FORBIDDEN", "You do not own this store");
  return store;
}

export async function createProduct(storeId: string, ownerId: string, body: unknown) {
  await ownedStore(storeId, ownerId);
  const input = validateProduct(body, false);
  return prisma.product.create({ data: { storeId, name: input.name as string, category: input.category as string, unit: input.unit as never, price: new Prisma.Decimal(input.price as number), stockQty: new Prisma.Decimal((input.stockQty as number | undefined) ?? 0), description: input.description as string | undefined, subcategory: input.subcategory as string | undefined, sku: input.sku as string | undefined, imageUrl: input.imageUrl as string | undefined, attributes: input.attributes as Prisma.InputJsonValue | undefined, source: (input.source as never) ?? "manual" } });
}

export async function listProducts(storeId: string, ownerId: string, query: Record<string, unknown>) {
  await ownedStore(storeId, ownerId);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where: Prisma.ProductWhereInput = { storeId };
  if (typeof query.category === "string") where.category = query.category;
  if (typeof query.active === "string") where.isActive = query.active === "true";
  if (typeof query.search === "string" && query.search) where.OR = [{ name: { contains: query.search, mode: "insensitive" } }, { description: { contains: query.search, mode: "insensitive" } }];
  if (typeof query.subcategory === "string") where.subcategory = query.subcategory;
  const [data, total] = await Promise.all([prisma.product.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }), prisma.product.count({ where })]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getProduct(storeId: string, productId: string, ownerId: string) {
  const product = await ownedProduct(productId, ownerId);
  if (product.storeId !== storeId) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");
  return product;
}

export async function updateProduct(productId: string, ownerId: string, body: unknown) {
  await ownedProduct(productId, ownerId);
  const input = validateProduct(body, true);
  const data: Prisma.ProductUpdateInput = {};
  for (const field of ["name", "description", "category", "subcategory", "sku", "imageUrl", "attributes", "isActive"] as const) if (input[field] !== undefined) data[field] = input[field] as never;
  if (input.unit !== undefined) data.unit = input.unit as never;
  if (input.price !== undefined) data.price = new Prisma.Decimal(input.price as number);
  if (input.stockQty !== undefined) data.stockQty = new Prisma.Decimal(input.stockQty as number);
  if (input.source !== undefined) data.source = input.source as never;
  return prisma.product.update({ where: { id: productId }, data });
}

export async function removeProduct(productId: string, ownerId: string) {
  await ownedProduct(productId, ownerId);
  await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
  return { message: "Product removed from catalog" };
}

export async function updateStock(productId: string, ownerId: string, body: unknown) {
  await ownedProduct(productId, ownerId);
  const stockQty = validateStock(body);
  return prisma.product.update({ where: { id: productId }, data: { stockQty: new Prisma.Decimal(stockQty) }, select: { id: true, storeId: true, stockQty: true, updatedAt: true } });
}
