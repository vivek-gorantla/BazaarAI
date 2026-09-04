import { prisma } from "../src/lib/prisma.js";

async function seedMockFlow() {
    console.log("🌱 Seeding mock data for Customer Flow...");

    // 1. Create or find mock Buyer
    const buyer = await prisma.user.upsert({
        where: { phone: "9999999999" },
        update: {},
        create: {
            role: "buyer",
            name: "Test Customer",
            phone: "9999999999",
        },
    });
    console.log(`✅ Buyer ready: ${buyer.name} (ID: ${buyer.id})`);

    // 2. Create or find mock Merchant & Store
    const merchant = await prisma.user.upsert({
        where: { phone: "8888888888" },
        update: {},
        create: {
            role: "merchant",
            name: "Test Merchant",
            phone: "8888888888",
        },
    });

    let store = await prisma.store.findFirst({ where: { ownerId: merchant.id } });
    if (!store) {
        store = await prisma.store.create({
            data: {
                ownerId: merchant.id,
                name: "Bazaar Fresh Supermarket",
                businessType: "grocery",
                address: "123 Market Street",
                lat: 12.9716,
                lng: 77.5946,
                status: "active",
            },
        });
    }
    console.log(`✅ Store ready: ${store.name} (ID: ${store.id})`);

    // 3. Products
    const createProduct = async (storeId: string, name: string, cat: string, subcat: string, unit: any, price: number) => {
        let p = await prisma.product.findFirst({ where: { storeId, name } });
        if (!p) {
            p = await prisma.product.create({
                data: { storeId, name, category: cat, subcategory: subcat, unit, price, stockQty: 500, isActive: true }
            });
        }
        return p;
    };

    const rice = await createProduct(store.id, "Premium Basmati Rice", "Groceries", "Grains", "kg", 150);
    const oil = await createProduct(store.id, "Sunflower Cooking Oil", "Groceries", "Oils", "litre", 120);
    const cake = await createProduct(store.id, "Rich Chocolate Truffle Cake", "Bakery", "Cakes", "piece", 600);
    console.log(`✅ Products ready: Rice, Oil, Chocolate Cake`);

    // 3.5 Create a second merchant for ambiguous discovery
    const merchant2 = await prisma.user.upsert({
        where: { phone: "7777777777" },
        update: {},
        create: {
            role: "merchant",
            name: "Daily Needs Grocery",
            phone: "7777777777",
        },
    });

    let store2 = await prisma.store.findFirst({ where: { ownerId: merchant2.id } });
    if (!store2) {
        store2 = await prisma.store.create({
            data: {
                ownerId: merchant2.id,
                name: "Daily Needs Supermarket",
                businessType: "grocery",
                address: "456 High Street",
                lat: 12.9720,
                lng: 77.5950,
                status: "active",
            },
        });
    }
    console.log(`✅ Second Store ready: ${store2.name} (ID: ${store2.id})`);

    const rice2 = await createProduct(store2.id, "Classic Basmati Rice", "Groceries", "Grains", "kg", 140);
    console.log(`✅ Created competing product: Classic Basmati Rice at ₹140/kg`);

    console.log("\n🎉 Mock data successfully seeded (Idempotent)!");
    console.log(`TEST USER ID: ${buyer.id}`);
}

seedMockFlow()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
