import { Prisma, ProductSource, ProductUnit } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import Redis from "../../lib/redis.js";
import { mapPrismaProduct } from "../../controllers/customer.js";

export interface CreateProductInput {
    storeId: string;
    name: string;
    description?: string;
    category: string;
    subcategory?: string;
    unit: ProductUnit;
    price: number;
    stockQty?: number;
    sku?: string;
    imageUrl?: string;
    attributes?: Array<{ name: string; value: string }>;
    source?: ProductSource;
    isActive?: boolean;
}

export interface SearchProductsInput {
    query?: string;
    storeId?: string;
    category?: string;
    subcategory?: string;
    unit?: ProductUnit;
    minPrice?: number;
    maxPrice?: number;
    sku?: string;
    source?: ProductSource;
    isActive?: boolean;
    limit?: number;
}

export interface UpdateProductInput {
    productId: string;
    storeId?: string;
    name?: string;
    description?: string;
    category?: string;
    subcategory?: string;
    unit?: ProductUnit;
    price?: number;
    stockQty?: number;
    sku?: string;
    imageUrl?: string;
    attributes?: Array<{ name: string; value: string }>;
    source?: ProductSource;
    isActive?: boolean;
}

export default class ProductService {
    async checkProductExists(productId: string, storeId?: string) {
        const cacheKey = `product:exists:${productId}:${storeId || 'any'}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const where: Prisma.ProductWhereInput = { id: productId };
        if (storeId) where.storeId = storeId;
        const product = await prisma.product.findFirst({ where });
        const exists = !!product;

        await Redis.setex(cacheKey, 900, JSON.stringify(exists));
        return exists;
    }

    async createProduct(data: CreateProductInput) {
        if (data.sku || data.name) {
            const existing = await prisma.product.findFirst({
                where: {
                    storeId: data.storeId,
                    OR: [
                        ...(data.sku ? [{ sku: { equals: data.sku.trim(), mode: "insensitive" as const } }] : []),
                        ...(data.name ? [{ name: { equals: data.name.trim(), mode: "insensitive" as const } }] : [])
                    ]
                }
            });

            if (existing) {
                return await prisma.product.update({
                    where: { id: existing.id },
                    data: {
                        name: data.name ? data.name.trim() : existing.name,
                        description: data.description ? data.description.trim() : existing.description,
                        category: data.category || existing.category,
                        subcategory: data.subcategory || existing.subcategory,
                        unit: data.unit || existing.unit,
                        price: data.price !== undefined ? new Prisma.Decimal(data.price) : existing.price,
                        stockQty: data.stockQty !== undefined ? new Prisma.Decimal(data.stockQty) : existing.stockQty,
                        imageUrl: data.imageUrl || existing.imageUrl,
                        source: data.source || existing.source,
                        isActive: true
                    }
                });
            }
        }

        const created = await prisma.product.create({
            data: {
                storeId: data.storeId,
                name: data.name,
                description: data.description,
                category: data.category,
                subcategory: data.subcategory,
                unit: data.unit,
                price: new Prisma.Decimal(data.price),
                stockQty: data.stockQty !== undefined ? new Prisma.Decimal(data.stockQty) : new Prisma.Decimal(0),
                sku: data.sku,
                imageUrl: data.imageUrl,
                attributes: data.attributes ? (data.attributes as unknown as Prisma.InputJsonValue) : undefined,
                source: data.source ?? "manual",
                isActive: data.isActive !== undefined ? data.isActive : true,
            },
            include: { store: true }
        });

        const mappedProduct = mapPrismaProduct(created, created.store.name);

        // --- Write-Aside Cache Updates ---

        // 1. Update catalog:discover
        try {
            const discoverCache = await Redis.get('catalog:discover');
            if (discoverCache) {
                const parsedDiscover = JSON.parse(discoverCache);
                if (parsedDiscover.collections) {
                    const categoryName = created.category || "Essentials";
                    const collectionTitle = `${categoryName} Essentials`;
                    const existingCollection = parsedDiscover.collections.find((c: any) => c.title === collectionTitle);
                    
                    if (existingCollection) {
                        // Optimistically increase count (UI uses string like 'X items')
                        const match = existingCollection.count.match(/\d+/);
                        if (match) {
                            existingCollection.count = `${parseInt(match[0]) + 1} items`;
                        }
                    } else {
                        parsedDiscover.collections.push({
                            title: collectionTitle,
                            subtitle: `Fresh ${categoryName.toLowerCase()} sourced directly from top local stores`,
                            count: `1 items`,
                            image: mappedProduct.image
                        });
                    }
                    await Redis.setex('catalog:discover', 300, JSON.stringify(parsedDiscover));
                }
            }
        } catch (err) {
            console.error('Failed to update catalog:discover cache', err);
        }

        // 2. Update catalog:home:* caches
        try {
            let cursor = '0';
            do {
                const [nextCursor, keys] = await Redis.scan(cursor, 'MATCH', 'catalog:home:*', 'COUNT', 100);
                cursor = nextCursor;
                
                for (const key of keys) {
                    const homeCache = await Redis.get(key);
                    if (homeCache) {
                        const parsedHome = JSON.parse(homeCache);
                        if (parsedHome.freshFinds && Array.isArray(parsedHome.freshFinds)) {
                            // Prepend new product
                            parsedHome.freshFinds.unshift(mappedProduct);
                            // Keep it to max 12 items as originally queried
                            if (parsedHome.freshFinds.length > 12) {
                                parsedHome.freshFinds.pop();
                            }
                            // Retain TTL, or overwrite with standard TTL
                            const ttl = await Redis.ttl(key);
                            await Redis.setex(key, ttl > 0 ? ttl : 300, JSON.stringify(parsedHome));
                        }
                    }
                }
            } while (cursor !== '0');
        } catch (err) {
            console.error('Failed to update catalog:home caches', err);
        }

        return created;
    }

    async deleteProduct(productId: string, storeId?: string) {
        if (!productId || !productId.trim()) {
            throw new Error("Product identifier (ID, SKU, or Name) is required for deletion");
        }
        const cleanId = productId.trim();
        let existing = await prisma.product.findFirst({
            where: { id: cleanId, ...(storeId ? { storeId } : {}) },
        });
        if (!existing) {
            existing = await prisma.product.findFirst({
                where: { sku: { equals: cleanId, mode: "insensitive" }, ...(storeId ? { storeId } : {}) },
            });
        }
        if (!existing) {
            existing = await prisma.product.findFirst({
                where: { name: { contains: cleanId, mode: "insensitive" }, ...(storeId ? { storeId } : {}) },
            });
        }
        if (!existing) {
            throw new Error(`Product "${productId}" not found in store catalog.`);
        }
        let product;
        try {
            product = await prisma.product.delete({
                where: { id: existing.id },
            });
        } catch (err) {
            product = await prisma.product.update({
                where: { id: existing.id },
                data: { isActive: false }
            });
        }

        // Invalidate cache
        if (product) {
            await Redis.del(`product:${product.id}:any`);
            await Redis.del(`product:${product.id}:${product.storeId}`);
            await Redis.del(`product:exists:${product.id}:any`);
            await Redis.del(`product:exists:${product.id}:${product.storeId}`);
            await Redis.del(`product:detail:${product.id}`);
            await Redis.del(`catalog:discover`);
        }

        return {
            success: true,
            message: `Product "${product.name}" (SKU: ${product.sku || 'N/A'}) deleted successfully from store catalog.`,
            deletedProduct: product
        };
    }

    async getProduct(productId: string, storeId?: string) {
        const cacheKey = `product:${productId}:${storeId || 'any'}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const where: Prisma.ProductWhereInput = { id: productId };
        if (storeId) where.storeId = storeId;
        const product = await prisma.product.findFirst({ where });

        if (product) {
            await Redis.setex(cacheKey, 900, JSON.stringify(product));
        }
        return product;
    }

    async searchProducts(data: SearchProductsInput = {}) {
        const where: Prisma.ProductWhereInput = {};

        if (data.storeId) where.storeId = data.storeId;
        if (data.category) where.category = data.category;
        if (data.subcategory) where.subcategory = data.subcategory;
        if (data.unit) where.unit = data.unit;
        if (data.sku) where.sku = data.sku;
        if (data.source) where.source = data.source;
        if (data.isActive !== undefined) where.isActive = data.isActive;

        if (data.minPrice !== undefined || data.maxPrice !== undefined) {
            where.price = {
                ...(data.minPrice !== undefined ? { gte: new Prisma.Decimal(data.minPrice) } : {}),
                ...(data.maxPrice !== undefined ? { lte: new Prisma.Decimal(data.maxPrice) } : {}),
            };
        }

        if (data.query) {
            where.OR = [
                { name: { contains: data.query, mode: "insensitive" } },
                { description: { contains: data.query, mode: "insensitive" } },
                { category: { contains: data.query, mode: "insensitive" } },
            ];
        }

        const cacheKey = `products:search:${JSON.stringify(data)}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const results = await prisma.product.findMany({
            where,
            take: data.limit || 50,
            orderBy: { createdAt: "desc" },
        });

        await Redis.setex(cacheKey, 300, JSON.stringify(results));
        return results;
    }

    async updateProduct(data: UpdateProductInput) {
        const { productId, storeId, ...updateFields } = data;

        if (!productId || !String(productId).trim()) {
            throw new Error("Product identifier (ID, SKU, or Name) is required for update");
        }

        const cleanId = String(productId).trim();
        let existing = await prisma.product.findFirst({
            where: { id: cleanId, ...(storeId ? { storeId } : {}) },
        });
        if (!existing) {
            existing = await prisma.product.findFirst({
                where: { sku: { equals: cleanId, mode: "insensitive" }, ...(storeId ? { storeId } : {}) },
            });
        }
        if (!existing) {
            existing = await prisma.product.findFirst({
                where: { name: { contains: cleanId, mode: "insensitive" }, ...(storeId ? { storeId } : {}) },
            });
        }
        if (!existing) {
            throw new Error(`Product "${productId}" not found in store catalog.`);
        }

        const targetId = existing.id;

        const updateData: Prisma.ProductUpdateInput = {};

        if (updateFields.name !== undefined) updateData.name = updateFields.name;
        if (updateFields.description !== undefined) updateData.description = updateFields.description;
        if (updateFields.category !== undefined) updateData.category = updateFields.category;
        if (updateFields.subcategory !== undefined) updateData.subcategory = updateFields.subcategory;
        if (updateFields.unit !== undefined) updateData.unit = updateFields.unit;
        if (updateFields.price !== undefined) updateData.price = new Prisma.Decimal(updateFields.price);
        if (updateFields.stockQty !== undefined) updateData.stockQty = new Prisma.Decimal(updateFields.stockQty);
        if (updateFields.sku !== undefined) updateData.sku = updateFields.sku;
        if (updateFields.imageUrl !== undefined) updateData.imageUrl = updateFields.imageUrl;
        if (updateFields.attributes !== undefined) updateData.attributes = updateFields.attributes as unknown as Prisma.InputJsonValue;
        if (updateFields.source !== undefined) updateData.source = updateFields.source;

        if (updateFields.isActive !== undefined) updateData.isActive = updateFields.isActive;

        const updated = await prisma.product.update({
            where: { id: targetId },
            data: updateData,
        });

        // Invalidate cache
        await Redis.del(`product:${targetId}:any`);
        await Redis.del(`product:${targetId}:${updated.storeId}`);
        await Redis.del(`product:exists:${targetId}:any`);
        await Redis.del(`product:exists:${targetId}:${updated.storeId}`);
        await Redis.del(`product:detail:${targetId}`);
        await Redis.del(`catalog:discover`);

        return updated;
    }
}