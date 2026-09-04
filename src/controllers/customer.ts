import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { razorpay } from "../lib/razorpay.js";
import redisClient from "../lib/redis.js";
// Haversine formula to compute distance between two lat/lng points in kilometers
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Session wishlist for real-time customer state
let sessionWishlist: any[] = [];

// Default anonymous user ID for unauthenticated sessions
const DEFAULT_USER_ID = "anonymous-customer";

// Extract user ID from request headers
function getUserId(req: Request): string {
  return (req.headers["x-user-id"] as string)
    || (req.headers["authorization"]?.replace("Bearer ", ""))
    || DEFAULT_USER_ID;
}

// Helper to format Prisma Product to Customer Frontend Product
export function mapPrismaProduct(p: any, storeName?: string) {
  return {
    id: p.id,
    title: p.name,
    description: p.description || "",
    category: p.category || "General",
    subcategory: p.subcategory || "",
    price: Number(p.price),
    originalPrice: Math.round(Number(p.price) * 1.15),
    weight: p.unit ? `1 ${p.unit}` : "1 Item",
    unit: p.unit || "item",
    stockQty: Number(p.stockQty || 0),
    inStock: Number(p.stockQty || 0) > 0,
    image: p.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500",
    storeName: storeName || p.store?.name || "Local Merchant",
    storeId: p.storeId,
    rating: 4.8,
    discountBadge: "10% OFF"
  };
}

// Helper to format Prisma Store to Customer Frontend Store
export function mapPrismaStore(s: any, userLat = 17.4156, userLng = 78.4347) {
  const dist = calculateHaversineDistance(userLat, userLng, s.lat, s.lng);
  return {
    id: s.id,
    name: s.name,
    category: s.businessType || "Kirana",
    categoryTag: `${s.businessType || "Local"} Store`,
    lat: s.lat,
    lng: s.lng,
    distanceNum: dist,
    distance: `${dist} km away`,
    rating: 4.8,
    reviewsCount: 150 + Math.floor(Math.random() * 200),
    address: `${s.address}, ${s.city || "Hyderabad"}`,
    phone: s.supportPhone || "+91 98765 43210",
    timing: "Open now • 8:00 AM - 10:00 PM",
    verified: true,
    featured: true,
    offerText: "Fast Delivery",
    image: s.bannerUrl || s.logoUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500"
  };
}

// 1. GET HOME DATA - Dynamic from Prisma DB
export const getHomeData = async (req: Request, res: Response) => {
  const userLat = Number(req.query.lat) || 17.4156;
  const userLng = Number(req.query.lng) || 78.4347;

  try {
    const cacheKey = `catalog:home:${userLat}:${userLng}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      res.json({ success: true, data: JSON.parse(cachedData), cached: true });
      return;
    }

    const stores = await prisma.store.findMany({
      where: { status: "active" },
      include: { products: { where: { isActive: true }, take: 5 } }
    });

    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { store: true },
      take: 12,
      orderBy: { createdAt: "desc" }
    });

    const sortedStores = stores
      .map(s => mapPrismaStore(s, userLat, userLng))
      .sort((a, b) => a.distanceNum - b.distanceNum);

    const freshFinds = products.map(p => mapPrismaProduct(p));

    const categoryNames = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const categories = (categoryNames.length > 0
      ? categoryNames
      : ["Groceries", "Fresh Produce", "Dairy & Milk", "Snacks & Munchies", "Bakery & Treats"]
    ).map(name => ({
      name,
      icon: name.includes("Produce")
        ? "nutrition"
        : name.includes("Dairy")
          ? "water_drop"
          : name.includes("Bakery")
            ? "bakery_dining"
            : "shopping_basket",
      color: "from-primary-fixed/40",
      textColor: "text-primary"
    }));

    const responseData = {
      hero: {
        title: "Shop your neighborhood.",
        subtitle: "Everything you need from stores you already know.",
        ctaText: "Explore nearby"
      },
      categories,
      nearbyStores: sortedStores,
      freshFinds
    };

    // Cache for 5 minutes (300 seconds)
    await redisClient.setex(cacheKey, 300, JSON.stringify(responseData));

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

// 2. GET STORES BY DISTANCE - Dynamic from Prisma DB
export const getStoresByDistance = async (req: Request, res: Response) => {
  const userLat = Number(req.query.lat) || 17.4156;
  const userLng = Number(req.query.lng) || 78.4347;
  const maxRadius = Number(req.query.radius) || 10;
  const categoryFilter = (req.query.category as string) || "All";

  try {
    const stores = await prisma.store.findMany({
      where: { status: "active" },
      include: { products: { where: { isActive: true } } }
    });

    const storesWithDistance = stores
      .map(s => mapPrismaStore(s, userLat, userLng))
      .filter(store => {
        const withinRadius = store.distanceNum <= maxRadius;
        const matchesCategory =
          categoryFilter === "All" || store.category.toLowerCase().includes(categoryFilter.toLowerCase());
        return withinRadius && matchesCategory;
      })
      .sort((a, b) => a.distanceNum - b.distanceNum);

    res.json({
      success: true,
      total: storesWithDistance.length,
      userLocation: { lat: userLat, lng: userLng },
      radius: maxRadius,
      data: storesWithDistance
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

// 3. GET STORE DETAIL - Dynamic from Prisma DB
export const getStoreDetail = async (req: Request, res: Response) => {
  const storeParam = String(req.params.storeId || req.params.id || "");

  try {
    let store = await prisma.store.findFirst({
      where: {
        OR: [
          { id: storeParam },
          { name: { contains: storeParam, mode: "insensitive" } }
        ]
      },
      include: {
        products: {
          where: { isActive: true }
        }
      }
    });

    if (!store) {
      store = await prisma.store.findFirst({
        where: { status: "active" },
        include: { products: { where: { isActive: true } } }
      });
    }

    if (!store) {
      res.status(404).json({ success: false, error: { message: "Store not found" } });
      return;
    }

    const mappedProducts = (store.products || []).map(p => mapPrismaProduct(p, store!.name));
    const storeDetail = {
      ...mapPrismaStore(store),
      products: mappedProducts
    };

    res.json({ success: true, data: storeDetail });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

// 4. GET DISCOVER DATA - Dynamic from Prisma DB
export const getDiscoverData = async (_req: Request, res: Response) => {
  try {
    const cacheKey = `catalog:discover`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      res.json({ success: true, data: JSON.parse(cachedData), cached: true });
      return;
    }

    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { store: true },
      take: 20
    });

    const stores = await prisma.store.findMany({
      where: { status: "active" },
      include: { products: { where: { isActive: true }, take: 5 } },
      take: 10
    });

    const categoryMap = new Map<string, any[]>();
    for (const p of products) {
      const cat = p.category || "Essentials";
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(p);
    }

    const collections = Array.from(categoryMap.entries()).map(([catName, catProds]) => ({
      title: `${catName} Essentials`,
      subtitle: `Fresh ${catName.toLowerCase()} sourced directly from top local stores`,
      count: `${catProds.length} items`,
      image: catProds[0]?.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500"
    }));

    const responseData = {
      collections,
      spotlightStores: stores.map(s => mapPrismaStore(s))
    };

    // Cache for 5 minutes (300 seconds)
    await redisClient.setex(cacheKey, 300, JSON.stringify(responseData));

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

// 5. CART APIS — Prisma DB backed, keyed by x-user-id
export const getCart = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  try {
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true, store: true }
    });
    // Map to frontend CartItem shape
    const mapped = cartItems.map(item => ({
      id: item.id,
      productId: item.productId,
      title: item.product?.name ?? "Unknown Item",
      price: Number(item.product?.price ?? 0),
      originalPrice: item.product?.price ? Math.round(Number(item.product.price) * 1.15) : undefined,
      weight: item.product?.unit ? `1 ${item.product.unit}` : undefined,
      image: item.product?.imageUrl ?? null,
      storeName: item.store?.name ?? "Nearby Store",
      storeId: item.storeId,
      quantity: Number(item.qty ?? 1),
    }));
    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

export const addToCart = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const item = req.body;
  try {
    // Try to find by productId if available, otherwise use id
    const productId = item.productId ?? item.id;
    // Resolve storeId — look up product's store if not provided
    let storeId = item.storeId;
    if (!storeId && productId) {
      const product = await prisma.product.findFirst({ where: { id: productId } });
      storeId = product?.storeId;
    }
    if (!storeId) {
      // Fallback: use session cart
      const existing = (global as any).__sessionCart = (global as any).__sessionCart || [];
      const found = existing.find((i: any) => i.id === item.id);
      if (found) { found.quantity = (found.quantity || 1) + (item.quantity || 1); }
      else { existing.push({ ...item, quantity: item.quantity || 1 }); }
      res.json({ success: true, data: existing });
      return;
    }
    // Upsert in Prisma cart
    const existing = await prisma.cart.findFirst({ where: { userId, productId } });
    if (existing) {
      await prisma.cart.update({
        where: { id: existing.id },
        data: { qty: { increment: Number(item.quantity ?? 1) } }
      });
    } else {
      await prisma.cart.create({
        data: { userId, productId, storeId, qty: Number(item.quantity ?? 1) }
      });
    }
    // Return updated cart
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true, store: true }
    });
    res.json({ success: true, data: cartItems.map(i => ({ id: i.id, productId: i.productId, title: i.product?.name, price: Number(i.product?.price ?? 0), quantity: Number(i.qty), storeName: i.store?.name })) });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

export const updateCartQuantity = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const cartItemId = String(req.params.id);
  const { delta } = req.body;
  try {
    const cartItem = await prisma.cart.findFirst({ where: { id: cartItemId, userId } });
    if (cartItem) {
      const newQty = Number(cartItem.qty) + Number(delta);
      if (newQty <= 0) {
        await prisma.cart.delete({ where: { id: cartItemId } });
      } else {
        await prisma.cart.update({ where: { id: cartItemId }, data: { qty: newQty } });
      }
    }
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true, store: true }
    });
    res.json({ success: true, data: cartItems.map(i => ({ id: i.id, productId: i.productId, title: i.product?.name, price: Number(i.product?.price ?? 0), quantity: Number(i.qty), storeName: i.store?.name })) });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

export const removeFromCart = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const cartItemId = String(req.params.id);
  try {
    await prisma.cart.deleteMany({ where: { id: cartItemId, userId } });
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true, store: true }
    });
    res.json({ success: true, data: cartItems.map(i => ({ id: i.id, productId: i.productId, title: i.product?.name, price: Number(i.product?.price ?? 0), quantity: Number(i.qty), storeName: i.store?.name })) });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};


// 6. WISHLIST APIS
export const getWishlist = async (_req: Request, res: Response) => {
  res.json({ success: true, data: sessionWishlist });
};

export const addToWishlist = async (req: Request, res: Response) => {
  const item = req.body;
  if (!sessionWishlist.some(i => i.id === item.id)) {
    sessionWishlist.push(item);
  }
  res.json({ success: true, data: sessionWishlist });
};

export const removeFromWishlist = async (req: Request, res: Response) => {
  const { id } = req.params;
  sessionWishlist = sessionWishlist.filter(i => i.id !== id);
  res.json({ success: true, data: sessionWishlist });
};

// 7. PROFILE APIS - Dynamic from Prisma DB
export const getProfile = async (req: Request, res: Response) => {
  const userId = (req.headers["x-user-id"] as string) || (req.headers["authorization"]?.replace("Bearer ", ""));
  try {
    if (userId) {
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      if (dbUser) {
        res.json({
          success: true,
          data: {
            name: dbUser.name,
            email: `${dbUser.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
            phone: dbUser.phone,
            walletBalance: 1250,
            address: {
              line1: "Flat 402, Royal Residency, Road No. 12",
              city: "Hyderabad",
              pincode: "500034",
              lat: 17.415,
              lng: 78.434
            }
          }
        });
        return;
      }
    }

    const firstUser = await prisma.user.findFirst({ where: { role: "buyer" } });
    res.json({
      success: true,
      data: {
        name: firstUser?.name || "Vivek Sharma",
        email: "vivek@example.com",
        phone: firstUser?.phone || "+91 98765 43210",
        walletBalance: 1250,
        address: {
          line1: "Flat 402, Royal Residency, Road No. 12",
          city: "Hyderabad",
          pincode: "500034",
          lat: 17.415,
          lng: 78.434
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

export const saveProfileAddress = async (req: Request, res: Response) => {
  const { name, phone } = req.body;
  const userId = (req.headers["x-user-id"] as string) || (req.headers["authorization"]?.replace("Bearer ", ""));
  try {
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(phone && { phone })
        }
      });
    }
    getProfile(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

// 8. SEARCH API - Dynamic from Prisma DB
export const getSearchData = async (req: Request, res: Response) => {
  const queryParam = req.query.q;
  const query = typeof queryParam === "string" ? queryParam : "";
  const catParam = req.query.category;
  const category = typeof catParam === "string" ? catParam : "All";
  const maxPrice = Number(req.query.maxPrice) || 10000;

  try {
    const cacheKey = `catalog:search:${query}:${category}:${maxPrice}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      res.json({ success: true, total: parsedData.length, data: parsedData, cached: true });
      return;
    }

    const where: any = { isActive: true };
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { subcategory: { contains: query, mode: "insensitive" } }
      ];
    }
    if (category !== "All") {
      where.category = { equals: category, mode: "insensitive" };
    }
    if (maxPrice > 0) {
      where.price = { lte: maxPrice };
    }

    const products = await prisma.product.findMany({
      where,
      include: { store: true },
      take: 50
    });

    const mapped = products.map(p => mapPrismaProduct(p));
    
    // Cache for 5 minutes (300 seconds)
    await redisClient.setex(cacheKey, 300, JSON.stringify(mapped));

    res.json({
      success: true,
      total: mapped.length,
      data: mapped
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

// 9. ORDER APIS - Dynamic Prisma DB Persistence
export const postOrder = async (req: Request, res: Response) => {
  const { items, address, paymentMethod, totalAmount } = req.body;
  const userId = (req.headers["x-user-id"] as string) || (req.headers["authorization"]?.replace("Bearer ", ""));

  try {
    let buyer = await prisma.user.findFirst({
      where: userId ? { id: userId } : { role: "buyer" }
    });

    if (!buyer) {
      buyer = await prisma.user.create({
        data: {
          role: "buyer",
          name: "Customer User",
          phone: `+91${Math.floor(7000000000 + Math.random() * 2999999999)}`
        }
      });
    }

    const firstItem = items?.[0];
    let storeId = firstItem?.storeId;
    if (!storeId) {
      const firstStore = await prisma.store.findFirst({ where: { status: "active" } });
      storeId = firstStore?.id;
    }

    if (!storeId) {
      res.status(400).json({ success: false, error: { message: "No active store found to process order" } });
      return;
    }

    const amount = Number(totalAmount || 0);

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid order amount",
        },
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `bazaar_${Date.now()}`,
    });



    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        storeId,
        status: "draft",
        totalAmount: amount,
        payment: {
          create: {
            razorpayOrderId: razorpayOrder.id,
            status: "created",
            method: "razorpay",
            amount: amount
          }
        }
      },
      include: {
        store: true,
        orderItems: { include: { product: true } },
        payment: true
      }
    });
    // Clear user cart upon order creation
    await prisma.cart.deleteMany({ where: { userId: buyer.id } });

    res.status(201).json({
      success: true,

      orderId: order.id,

      razorpay: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },

      data: {
        id: order.id,
        storeName: order.store.name,
        totalAmount: amount,
        itemCount: items?.length || 0,
        items,
        address,
        paymentMethod,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

export const getCustomerOrders = async (req: Request, res: Response) => {
  const userId = (req.headers["x-user-id"] as string) || (req.headers["authorization"]?.replace("Bearer ", ""));

  try {
    const orders = await prisma.order.findMany({
      where: userId ? { buyerId: userId } : {},
      include: {
        store: true,
        orderItems: { include: { product: true } },
        payment: true
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const mapped = orders.map(o => ({
      id: o.id,
      date: o.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      storeName: o.store.name,
      status: o.status === "confirmed" ? "In Transit" : o.status,
      statusColor: "bg-tertiary-fixed text-on-tertiary-fixed",
      totalAmount: Number(o.totalAmount),
      itemCount: o.orderItems.length,
      items: o.orderItems.map(item => ({
        id: item.id,
        title: item.product?.name || "Product Item",
        price: Number(item.priceAtPurchase),
        quantity: Number(item.qty)
      })),
      canTrack: true
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};

// 10. PRODUCT DETAIL API - Dynamic from Prisma DB
export const getProductDetail = async (req: Request, res: Response) => {
  const productParam = String(req.params.id || req.params.productId || "");

  try {
    const cacheKey = `product:detail:${productParam}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      res.json({ success: true, data: JSON.parse(cachedData), cached: true });
      return;
    }

    let product = await prisma.product.findFirst({
      where: {
        OR: [{ id: productParam }, { name: { contains: productParam, mode: "insensitive" } }]
      },
      include: { store: true }
    });

    if (!product) {
      product = await prisma.product.findFirst({
        where: { isActive: true },
        include: { store: true }
      });
    }

    if (!product) {
      res.status(404).json({ success: false, error: { message: "Product not found" } });
      return;
    }

    const related = await prisma.product.findMany({
      where: { storeId: product.storeId, NOT: { id: product.id } },
      include: { store: true },
      take: 4
    });

    const fullDetail = {
      ...mapPrismaProduct(product),
      subcategory: product.subcategory || "Essentials",
      sku: product.sku || `SKU-${product.id.slice(0, 6)}`,
      stockQty: Number(product.stockQty),
      description: product.description || `${product.name} sourced fresh from ${product.store.name}.`,
      images: [
        product.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500"
      ],
      variants: [
        { id: "var-1", name: `1 ${product.unit}`, price: Number(product.price), originalPrice: Math.round(Number(product.price) * 1.15) }
      ],
      merchant: mapPrismaStore(product.store),
      specs: [
        { label: "Category", value: product.category },
        { label: "Unit", value: String(product.unit) },
        { label: "Stock Available", value: `${product.stockQty} ${product.unit}` }
      ],
      reviewsSummary: {
        averageRating: 4.8,
        totalCount: 42,
        starBreakdown: { 5: 35, 4: 5, 3: 2, 2: 0, 1: 0 }
      },
      reviews: [],
      relatedProducts: related.map(r => mapPrismaProduct(r))
    };

    // Cache for 15 minutes (900 seconds)
    await redisClient.setex(cacheKey, 900, JSON.stringify(fullDetail));

    res.json({ success: true, data: fullDetail });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
};
