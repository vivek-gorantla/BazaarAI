import { prisma } from "../lib/prisma.js";
import Redis from "../lib/redis.js";
export class CustomerService {
    constructor() {
    }

    async chat(query: string): Promise<string> {
        try {
            const message = `we are processing your request ${query}`;
            await Redis.set("user-prompt", JSON.stringify({ message }));
            return message;
        } catch (error: any) {
            console.error(error);
            return "Sorry, I'm having trouble understanding you right now. Please try again later.";
        }
    }

    async searchProducts(query: string) {
        const cacheKey = `searchProducts:${query}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const products = await prisma.product.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive'
                },
                isActive: true
            },
            take: 5,
            select: {
                id: true,
                name: true,
                price: true,
                storeId: true,
                category: true,
                store: { select: { name: true, city: true } }
            }
        });

        await Redis.setex(cacheKey, 300, JSON.stringify(products)); // Cache for 5 minutes
        return products;
    }

    async getProduct(productId: string) {
        const cacheKey = `product:${productId}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { store: { select: { name: true, city: true } } }
        });

        if (product) {
            await Redis.setex(cacheKey, 600, JSON.stringify(product)); // Cache for 10 minutes
        }
        return product;
    }

    async searchMerchants(location?: string, productId?: string) {
        const cacheKey = `searchMerchants:${location || 'any'}:${productId || 'any'}`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const whereClause: any = { status: 'active' };

        if (location) {
            whereClause.city = { contains: location, mode: 'insensitive' };
        }
        if (productId) {
            whereClause.products = { some: { id: productId } };
        }

        const merchants = await prisma.store.findMany({
            where: whereClause,
            take: 5,
            select: {
                id: true,
                name: true,
                city: true,
                deliveryEnabled: true,
            }
        });

        await Redis.setex(cacheKey, 300, JSON.stringify(merchants)); // Cache for 5 minutes
        return merchants;
    }

    async checkAvailability(productId: string, storeId: string, quantity: number) {
        const product = await prisma.product.findFirst({
            where: { id: productId, storeId: storeId }
        });

        if (!product) return { available: false, quantity: 0, error: "Product not found in this store" };
        if (!product.isActive) return { available: false, quantity: 0, error: "Product is no longer active" };

        const stock = product.stockQty.toNumber();
        return {
            available: stock >= quantity,
            quantity: stock
        };
    }

    async searchCategories() {
        const cacheKey = `categories`;
        const cached = await Redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const categories = await prisma.product.findMany({
            where: { isActive: true },
            distinct: ['category'],
            select: { category: true }
        });
        const result = categories.map(c => c.category);
        
        await Redis.setex(cacheKey, 3600, JSON.stringify(result)); // Cache for 1 hour
        return result;
    }

    async addToCart(userId: string, productId: string, storeId: string, quantity: number) {
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            await prisma.user.create({
                data: {
                    id: userId,
                    role: "buyer",
                    name: userId === "anonymous-customer" ? "Guest User" : "Customer User",
                    phone: `+91${Math.floor(7000000000 + Math.random() * 2999999999)}`
                }
            });
        }

        const existingCartItem = await prisma.cart.findFirst({
            where: {
                userId: userId,
                productId: productId,
                storeId: storeId
            }
        })

        if (existingCartItem) {
            const updatedCartItem = await prisma.cart.update({
                where: {
                    id: existingCartItem.id
                },
                data: {
                    qty: {
                        increment: quantity
                    }
                }
            })
            return updatedCartItem;
        } else {
            const cartItem = await prisma.cart.create({
                data: {
                    userId: userId,
                    productId: productId,
                    storeId: storeId,
                    qty: quantity
                }
            })
            return cartItem;
        }
    }

    async removeFromCart(userId: string, productId: string, storeId: string) {
        const deletedCartItem = await prisma.cart.deleteMany({
            where: {
                userId,
                productId,
                storeId
            }
        });
        return deletedCartItem.count > 0;
    }

    async updateCartItem(userId: string, productId: string, storeId: string, quantity: number) {
        if (quantity <= 0) {
            return this.removeFromCart(userId, productId, storeId);
        }

        const existingCartItem = await prisma.cart.findFirst({
            where: { userId, productId, storeId }
        });

        if (existingCartItem) {
            return await prisma.cart.update({
                where: { id: existingCartItem.id },
                data: { qty: quantity }
            });
        }
        throw new Error("Cart item not found.");
    }

    async getCart(userId: string) {
        return await prisma.cart.findMany({
            where: { userId },
            include: {
                product: true,
                store: true
            }
        });
    }

    async calculateCartTotal(userId: string) {
        const cartItems = await this.getCart(userId);
        let total = 0;
        for (const item of cartItems) {
            // Price is a Decimal, so convert to number for calculation
            const itemPrice = item.product.price.toNumber();
            const qty = item.qty.toNumber();
            total += itemPrice * qty;
        }
        return {
            totalAmount: total,
            itemCount: cartItems.length
        };
    }

    async applyCoupon(userId: string, couponCode: string) {
        const cartTotalInfo = await this.calculateCartTotal(userId);

        // Placeholder coupon logic since no Coupon table exists
        let discount = 0;
        if (couponCode.toUpperCase() === "WELCOME10") {
            discount = cartTotalInfo.totalAmount * 0.10;
        } else if (couponCode.toUpperCase() === "FLAT50") {
            discount = 50;
        }

        const newTotal = Math.max(0, cartTotalInfo.totalAmount - discount);

        return {
            originalTotal: cartTotalInfo.totalAmount,
            discountApplied: discount,
            finalTotal: newTotal,
            message: discount > 0 ? "Coupon applied successfully" : "Invalid coupon code"
        };
    }

    async validateCart(userId: string) {
        const cartItems = await this.getCart(userId);
        const issues = [];
        let valid = true;

        for (const item of cartItems) {
            if (!item.product.isActive) {
                valid = false;
                issues.push(`Product ${item.product.name} is no longer active.`);
            } else if (item.product.stockQty.toNumber() < item.qty.toNumber()) {
                valid = false;
                issues.push(`Only ${item.product.stockQty.toNumber()} units available for ${item.product.name}. You requested ${item.qty.toNumber()}.`);
            }
        }

        return {
            isValid: valid,
            issues
        };
    }

}