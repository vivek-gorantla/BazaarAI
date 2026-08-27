import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export type CatalogSearchParams = { query?: string; category?: string; subcategory?: string; storeId?: string; minPrice?: number; maxPrice?: number; limit?: number; lat?: number; lng?: number; radiusKm?: number };

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const a = Math.sin((radians(lat2 - lat1)) / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin((radians(lng2 - lng1)) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function searchCatalog(params: CatalogSearchParams) {
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (params.storeId) where.storeId = params.storeId;
  if (params.category) where.category = params.category;
  if (params.subcategory) where.subcategory = params.subcategory;
  if (params.minPrice !== undefined || params.maxPrice !== undefined) where.price = { ...(params.minPrice !== undefined ? { gte: new Prisma.Decimal(params.minPrice) } : {}), ...(params.maxPrice !== undefined ? { lte: new Prisma.Decimal(params.maxPrice) } : {}) };
  if (params.query) where.OR = [{ name: { contains: params.query, mode: "insensitive" } }, { description: { contains: params.query, mode: "insensitive" } }, { category: { contains: params.query, mode: "insensitive" } }];
  const products = await prisma.product.findMany({ where, include: { store: true }, orderBy: { name: "asc" }, take: 1000 });
  const filtered = params.lat !== undefined && params.lng !== undefined && params.radiusKm !== undefined ? products.filter((product) => distanceKm(params.lat!, params.lng!, product.store.lat, product.store.lng) <= params.radiusKm!) : products;
  return filtered.slice(0, Math.min(100, Math.max(1, params.limit || 20)));
}
