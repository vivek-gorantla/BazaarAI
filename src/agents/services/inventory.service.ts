import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import Redis from "../../lib/redis.js";

export interface SetStockInput {
    productId: string;
    stockQty: number;
    reason?: string;
    storeId?: string;
}

export interface ChangeStockInput {
    productId: string;
    quantity: number;
    reason?: string;
    storeId?: string;
}

export interface GetLowStockInput {
    storeId?: string;
    threshold?: number;
    limit?: number;
}

export interface GetOutOfStockInput {
    storeId?: string;
    limit?: number;
}

export interface GetInventoryHistoryInput {
    productId?: string;
    storeId?: string;
    limit?: number;
}

export default class InventoryService {
    private async resolveProduct(identifier: string, storeId?: string) {
        if (!identifier || !identifier.trim()) {
            return null;
        }

        // 1. Try lookup by exact ID
        let product = await prisma.product.findFirst({
            where: {
                id: identifier.trim(),
                ...(storeId ? { storeId } : {}),
            },
        });

        // 2. Try lookup by Name (contains or exact match)
        if (!product) {
            product = await prisma.product.findFirst({
                where: {
                    name: { contains: identifier.trim(), mode: "insensitive" },
                    ...(storeId ? { storeId } : {}),
                },
            });
        }

        return product;
    }

    private async resolveProductOrThrow(identifier: string, storeId?: string) {
        if (!identifier || !identifier.trim()) {
            throw new Error("Product identifier (ID or name) is required");
        }

        let product = await this.resolveProduct(identifier, storeId);

        if (!product) {
            throw new Error(`Product "${identifier}" not found in inventory. Please clarify the exact name, SKU, or ask to create it first.`);
        }

        return product;
    }

    async setStock(data: SetStockInput) {
        const product = await this.resolveProductOrThrow(data.productId, data.storeId);
        const updated = await prisma.product.update({
            where: { id: product.id },
            data: {
                stockQty: new Prisma.Decimal(data.stockQty),
            },
            select: {
                id: true,
                name: true,
                storeId: true,
                stockQty: true,
                unit: true,
                updatedAt: true,
            },
        });

        await Redis.del(`inventory:stock:${updated.id}:any`);
        await Redis.del(`inventory:stock:${updated.id}:${updated.storeId}`);
        return updated;
    }

    async increaseStock(data: ChangeStockInput) {
        const product = await this.resolveProductOrThrow(data.productId, data.storeId);
        const updated = await prisma.product.update({
            where: { id: product.id },
            data: {
                stockQty: { increment: new Prisma.Decimal(data.quantity) },
            },
            select: {
                id: true,
                name: true,
                storeId: true,
                stockQty: true,
                unit: true,
                updatedAt: true,
            },
        });

        await Redis.del(`inventory:stock:${updated.id}:any`);
        await Redis.del(`inventory:stock:${updated.id}:${updated.storeId}`);
        return updated;
    }

    async decreaseStock(data: ChangeStockInput) {
        const product = await this.resolveProduct(data.productId, data.storeId);
        if (!product) {
            throw new Error(`Product "${data.productId}" does not exist currently in store inventory.`);
        }
        const currentQty = Number(product.stockQty);
        if (currentQty <= 0) {
            throw new Error(`Cannot decrease stock. Product "${product.name}" is currently out of stock (0 units).`);
        }
        const newQty = Math.max(0, currentQty - data.quantity);
        const updated = await prisma.product.update({
            where: { id: product.id },
            data: {
                stockQty: new Prisma.Decimal(newQty),
            },
            select: {
                id: true,
                name: true,
                storeId: true,
                stockQty: true,
                unit: true,
                updatedAt: true,
            },
        });

        await Redis.del(`inventory:stock:${updated.id}:any`);
        await Redis.del(`inventory:stock:${updated.id}:${updated.storeId}`);
        return updated;
    }

    async getStock(productId: string, storeId?: string) {
        const cacheKey = `inventory:stock:${productId}:${storeId || 'any'}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        let product = await prisma.product.findFirst({
            where: {
                id: productId,
                ...(storeId ? { storeId } : {}),
            },
            select: {
                id: true,
                name: true,
                storeId: true,
                stockQty: true,
                unit: true,
                price: true,
                updatedAt: true,
            },
        });

        if (!product) {
            product = await prisma.product.findFirst({
                where: {
                    name: { contains: productId, mode: "insensitive" },
                    ...(storeId ? { storeId } : {}),
                },
                select: {
                    id: true,
                    name: true,
                    storeId: true,
                    stockQty: true,
                    unit: true,
                    price: true,
                    updatedAt: true,
                },
            });
        }

        if (product) {
            await Redis.setex(cacheKey, 30, JSON.stringify(product)); // 30 seconds
        }
        return product;
    }

    async getLowStock(data: GetLowStockInput = {}) {
        const threshold = data.threshold !== undefined ? data.threshold : 10;
        const where: Prisma.ProductWhereInput = {
            stockQty: { lte: new Prisma.Decimal(threshold), gt: new Prisma.Decimal(0) },
            isActive: true,
        };
        if (data.storeId) where.storeId = data.storeId;

        const cacheKey = `inventory:lowstock:${JSON.stringify(data)}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const results = await prisma.product.findMany({
            where,
            take: data.limit || 50,
            orderBy: { stockQty: "asc" },
        });

        await Redis.setex(cacheKey, 300, JSON.stringify(results));
        return results;
    }

    async getOutOfStock(data: GetOutOfStockInput = {}) {
        const where: Prisma.ProductWhereInput = {
            stockQty: { lte: new Prisma.Decimal(0) },
            isActive: true,
        };
        if (data.storeId) where.storeId = data.storeId;

        const cacheKey = `inventory:outofstock:${JSON.stringify(data)}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const results = await prisma.product.findMany({
            where,
            take: data.limit || 50,
            orderBy: { name: "asc" },
        });

        await Redis.setex(cacheKey, 300, JSON.stringify(results));
        return results;
    }

    async getInventorySummary(storeId?: string) {
        const where: Prisma.ProductWhereInput = { isActive: true };
        if (storeId) where.storeId = storeId;

        const cacheKey = `inventory:summary:${storeId || 'any'}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const [totalProducts, outOfStockCount, lowStockCount] = await Promise.all([
            prisma.product.count({ where }),
            prisma.product.count({
                where: { ...where, stockQty: { lte: new Prisma.Decimal(0) } },
            }),
            prisma.product.count({
                where: { ...where, stockQty: { lte: new Prisma.Decimal(10), gt: new Prisma.Decimal(0) } },
            }),
        ]);

        const summary = {
            totalProducts,
            inStockCount: totalProducts - outOfStockCount,
            lowStockCount,
            outOfStockCount,
        };

        await Redis.setex(cacheKey, 300, JSON.stringify(summary));
        return summary;
    }

    async getInventoryHistory(data: GetInventoryHistoryInput = {}) {
        const where: Prisma.ProductWhereInput = { isActive: true };
        if (data.storeId) where.storeId = data.storeId;
        if (data.productId) where.id = data.productId;

        const cacheKey = `inventory:history:${JSON.stringify(data)}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const results = await prisma.product.findMany({
            where,
            take: data.limit || 50,
            select: {
                id: true,
                name: true,
                storeId: true,
                stockQty: true,
                updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
        });

        await Redis.setex(cacheKey, 300, JSON.stringify(results));
        return results;
    }
}
