import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

export default class GrowthService {
    /**
     * Campaign Orchestration
     * Applies a discount campaign to products matching a query or category.
     */
    async orchestrateCampaign(args: { storeId: string; query?: string; category?: string; discountPercentage: number; campaignName: string }) {
        const { storeId, query, category, discountPercentage, campaignName } = args;

        const whereClause: Prisma.ProductWhereInput = {
            storeId,
            isActive: true,
        };
        if (category) {
            whereClause.category = { contains: category, mode: 'insensitive' };
        }
        if (query) {
            whereClause.name = { contains: query, mode: 'insensitive' };
        }

        const products = await prisma.product.findMany({ where: whereClause });
        if (products.length === 0) return { success: false, message: "No products found matching criteria." };

        let updatedCount = 0;
        for (const product of products) {
            const attributes = (product.attributes as any) || {};
            attributes.campaign = {
                name: campaignName,
                discountPercentage,
                appliedAt: new Date().toISOString()
            };

            await prisma.product.update({
                where: { id: product.id },
                data: { attributes: attributes as Prisma.InputJsonValue }
            });
            updatedCount++;
        }

        return { success: true, message: `Successfully applied campaign '${campaignName}' to ${updatedCount} products.` };
    }

    /**
     * Create Upsell
     */
    async createUpsell(args: { storeId: string; baseProductId: string; premiumProductId: string }) {
        const { storeId, baseProductId, premiumProductId } = args;
        const product = await prisma.product.findUnique({ where: { id: baseProductId } });
        if (!product || product.storeId !== storeId) return { success: false, message: "Base product not found in this store." };

        const premiumProduct = await prisma.product.findUnique({ where: { id: premiumProductId } });
        if (!premiumProduct || premiumProduct.storeId !== storeId) return { success: false, message: "Premium product not found in this store." };

        const attributes = (product.attributes as any) || {};
        attributes.upsell = { targetProductId: premiumProductId, targetName: premiumProduct.name };

        await prisma.product.update({
            where: { id: baseProductId },
            data: { attributes: attributes as Prisma.InputJsonValue }
        });

        return { success: true, message: `Upsell configured: ${product.name} -> ${premiumProduct.name}` };
    }

    /**
     * Create Cross Sell
     */
    async createCrossSell(args: { storeId: string; primaryProductId: string; complementaryProductIds: string[] }) {
        const { storeId, primaryProductId, complementaryProductIds } = args;
        const product = await prisma.product.findUnique({ where: { id: primaryProductId } });
        if (!product || product.storeId !== storeId) return { success: false, message: "Primary product not found." };

        const attributes = (product.attributes as any) || {};
        attributes.cross_sell = attributes.cross_sell || [];
        
        for (const cid of complementaryProductIds) {
            if (!attributes.cross_sell.includes(cid)) {
                attributes.cross_sell.push(cid);
            }
        }

        await prisma.product.update({
            where: { id: primaryProductId },
            data: { attributes: attributes as Prisma.InputJsonValue }
        });

        return { success: true, message: `Cross-sells added to ${product.name}.` };
    }

    /**
     * Conversational Checkout (POS)
     */
    async conversationalCheckout(args: { storeId: string; customerPhone?: string; items: { productId: string; qty: number }[]; paymentMethod: string }) {
        const { storeId, customerPhone, items, paymentMethod } = args;

        let buyerId: string | undefined = undefined;
        if (customerPhone) {
            const user = await prisma.user.findUnique({ where: { phone: customerPhone } });
            if (user) buyerId = user.id;
        }

        if (!buyerId) {
            // Find or create a generic 'Walk-in Customer' for this store
            let generic = await prisma.user.findUnique({ where: { phone: `WALKIN_${storeId}` } });
            if (!generic) {
                generic = await prisma.user.create({
                    data: {
                        name: "Walk-in Customer",
                        phone: `WALKIN_${storeId}`,
                        role: "buyer",
                    }
                });
            }
            buyerId = generic.id;
        }

        let totalAmount = 0;
        const orderItemsData = [];

        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.productId } });
            if (!product || product.storeId !== storeId) throw new Error(`Product ${item.productId} not found.`);
            
            const itemPrice = Number(product.price);
            const lineTotal = itemPrice * item.qty;
            totalAmount += lineTotal;

            orderItemsData.push({
                productId: product.id,
                qty: new Prisma.Decimal(item.qty),
                priceAtPurchase: new Prisma.Decimal(itemPrice)
            });

            // decrement stock
            await prisma.product.update({
                where: { id: product.id },
                data: { stockQty: { decrement: item.qty } }
            });
        }

        const order = await prisma.order.create({
            data: {
                storeId,
                buyerId,
                status: "paid", // Instantly paid for POS
                totalAmount: new Prisma.Decimal(totalAmount),
                orderItems: {
                    create: orderItemsData
                }
            }
        });

        return { success: true, message: `Checkout successful. Order ID: ${order.id} for ₹${totalAmount}.`, orderId: order.id, totalAmount };
    }
}
