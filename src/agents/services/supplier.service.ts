import { POStatus, Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import Redis from "../../lib/redis.js";

export interface CreateSupplierInput {
    name: string;
    phone: string;
    companyName?: string;
    email?: string;
    category?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    paymentTerms?: string;
}

export interface UpdateSupplierInput {
    supplierId: string;
    name?: string;
    phone?: string;
    companyName?: string;
    email?: string;
    category?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    paymentTerms?: string;
}

export interface SearchSuppliersInput {
    query?: string;
    category?: string;
    city?: string;
    limit?: number;
}

export interface CreatePurchaseOrderItemInput {
    name: string;
    qty: number;
    unitPrice: number;
    productId?: string;
    supplierProductId?: string;
}

export interface CreatePurchaseOrderInput {
    storeId: string;
    supplierId: string;
    items: CreatePurchaseOrderItemInput[];
    notes?: string;
    expectedDelivery?: string;
}

export interface GetSupplierOrdersInput {
    storeId?: string;
    supplierId?: string;
    status?: POStatus;
    limit?: number;
}

export default class SupplierService {
    async createSupplier(data: CreateSupplierInput) {
        return await prisma.supplier.create({
            data: {
                name: data.name,
                phone: data.phone,
                companyName: data.companyName,
                email: data.email,
                category: data.category,
                address: data.address,
                city: data.city,
                state: data.state,
                pincode: data.pincode,
                gstin: data.gstin,
                paymentTerms: data.paymentTerms,
            },
        });
    }

    async updateSupplier(data: UpdateSupplierInput) {
        const { supplierId, ...updateFields } = data;
        const updateData: Prisma.SupplierUpdateInput = {};

        if (updateFields.name !== undefined) updateData.name = updateFields.name;
        if (updateFields.phone !== undefined) updateData.phone = updateFields.phone;
        if (updateFields.companyName !== undefined) updateData.companyName = updateFields.companyName;
        if (updateFields.email !== undefined) updateData.email = updateFields.email;
        if (updateFields.category !== undefined) updateData.category = updateFields.category;
        if (updateFields.address !== undefined) updateData.address = updateFields.address;
        if (updateFields.city !== undefined) updateData.city = updateFields.city;
        if (updateFields.state !== undefined) updateData.state = updateFields.state;
        if (updateFields.pincode !== undefined) updateData.pincode = updateFields.pincode;
        if (updateFields.gstin !== undefined) updateData.gstin = updateFields.gstin;
        if (updateFields.paymentTerms !== undefined) updateData.paymentTerms = updateFields.paymentTerms;

        const updated = await prisma.supplier.update({
            where: { id: supplierId },
            data: updateData,
        });

        await Redis.del(`supplier:${supplierId}`);

        return updated;
    }

    async deleteSupplier(supplierId: string) {
        const supplier = await prisma.supplier.delete({
            where: { id: supplierId },
        });

        await Redis.del(`supplier:${supplierId}`);

        return !!supplier;
    }

    async getSupplier(supplierId: string) {
        const cacheKey = `supplier:${supplierId}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
            include: {
                products: true,
            },
        });

        if (supplier) {
            await Redis.setex(cacheKey, 1800, JSON.stringify(supplier)); // 30 mins
        }
        return supplier;
    }

    async searchSuppliers(data: SearchSuppliersInput = {}) {
        const where: Prisma.SupplierWhereInput = {};

        if (data.category && data.category !== "All") {
            where.category = { contains: data.category, mode: "insensitive" };
        }

        if (data.city) {
            where.city = { contains: data.city, mode: "insensitive" };
        }

        if (data.query && data.query.trim()) {
            where.OR = [
                { name: { contains: data.query, mode: "insensitive" } },
                { companyName: { contains: data.query, mode: "insensitive" } },
                { category: { contains: data.query, mode: "insensitive" } },
            ];
        }

        const cacheKey = `suppliers:search:${JSON.stringify(data)}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const results = await prisma.supplier.findMany({
            where,
            include: {
                products: true,
            },
            take: data.limit || 50,
            orderBy: { rating: "desc" },
        });

        await Redis.setex(cacheKey, 300, JSON.stringify(results)); // 5 mins
        return results;
    }

    async createPurchaseOrder(data: CreatePurchaseOrderInput) {
        const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        let totalAmount = 0;
        const formattedItems = data.items.map((item) => {
            const qty = Number(item.qty) || 1;
            const unitPrice = Number(item.unitPrice) || 0;
            const totalPrice = qty * unitPrice;
            totalAmount += totalPrice;

            return {
                productId: item.productId || null,
                supplierProductId: item.supplierProductId || null,
                name: item.name,
                qty: new Prisma.Decimal(qty),
                unitPrice: new Prisma.Decimal(unitPrice),
                totalPrice: new Prisma.Decimal(totalPrice),
            };
        });

        return await prisma.purchaseOrder.create({
            data: {
                poNumber,
                storeId: data.storeId,
                supplierId: data.supplierId,
                status: "sent",
                totalAmount: new Prisma.Decimal(totalAmount),
                notes: data.notes,
                expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
                items: {
                    create: formattedItems,
                },
            },
            include: {
                supplier: true,
                items: true,
            },
        });
    }

    async getSupplierOrders(data: GetSupplierOrdersInput = {}) {
        const where: Prisma.PurchaseOrderWhereInput = {};

        if (data.storeId) where.storeId = data.storeId;
        if (data.supplierId) where.supplierId = data.supplierId;
        if (data.status) where.status = data.status;

        const cacheKey = `supplierOrders:${JSON.stringify(data)}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const results = await prisma.purchaseOrder.findMany({
            where,
            include: {
                supplier: true,
                items: true,
            },
            take: data.limit || 50,
            orderBy: { createdAt: "desc" },
        });

        await Redis.setex(cacheKey, 300, JSON.stringify(results)); // 5 mins
        return results;
    }
}
