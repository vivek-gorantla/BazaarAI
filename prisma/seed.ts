import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ProductSource,
  ProductUnit,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  StoreStatus,
  Prisma,
  PrismaClient,
} from "../src/generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals = 2): Prisma.Decimal {
  const value = Math.random() * (max - min) + min;
  return new Prisma.Decimal(value.toFixed(decimals));
}

function randomPhone(): string {
  // Indian mobile number format
  return `+91${randomInt(70000, 99999)}${randomInt(10000, 99999)}`;
}

// ---------------------------------------------------------------------------
// Seed data catalogs
// ---------------------------------------------------------------------------

const CITIES = [
  { city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { city: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
  { city: "Delhi", state: "Delhi", lat: 28.7041, lng: 77.1025 },
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
];

const BUSINESS_TYPES = [
  "grocery",
  "kirana",
  "electronics",
  "stationery",
  "hardware",
  "pharmacy",
  "fashion",
];

const PRODUCT_CATALOG: Array<{
  name: string;
  category: string;
  subcategory?: string;
  unit: ProductUnit;
  priceRange: [number, number];
}> = [
  { name: "Basmati Rice", category: "Grocery", subcategory: "Rice & Grains", unit: ProductUnit.kg, priceRange: [60, 180] },
  { name: "Toor Dal", category: "Grocery", subcategory: "Pulses", unit: ProductUnit.kg, priceRange: [110, 160] },
  { name: "Sunflower Oil", category: "Grocery", subcategory: "Cooking Oil", unit: ProductUnit.litre, priceRange: [140, 210] },
  { name: "Amul Milk", category: "Dairy", subcategory: "Milk", unit: ProductUnit.litre, priceRange: [28, 34] },
  { name: "Tomatoes", category: "Vegetables", unit: ProductUnit.kg, priceRange: [20, 60] },
  { name: "Onions", category: "Vegetables", unit: ProductUnit.kg, priceRange: [25, 55] },
  { name: "A4 Notebook 200 Pages", category: "Stationery", subcategory: "Notebooks", unit: ProductUnit.piece, priceRange: [40, 90] },
  { name: "Ball Pen Pack of 10", category: "Stationery", subcategory: "Pens", unit: ProductUnit.pack, priceRange: [30, 60] },
  { name: "USB-C Cable", category: "Electronics", subcategory: "Cables", unit: ProductUnit.piece, priceRange: [99, 399] },
  { name: "LED Bulb 9W", category: "Electronics", subcategory: "Lighting", unit: ProductUnit.piece, priceRange: [60, 150] },
  { name: "PVC Pipe 1 inch", category: "Hardware", subcategory: "Plumbing", unit: ProductUnit.meter, priceRange: [35, 70] },
  { name: "Cement Bag", category: "Hardware", subcategory: "Construction", unit: ProductUnit.box, priceRange: [350, 420] },
  { name: "Paracetamol 500mg", category: "Pharmacy", subcategory: "Medicine", unit: ProductUnit.pack, priceRange: [15, 40] },
  { name: "Hand Sanitizer 200ml", category: "Pharmacy", subcategory: "Hygiene", unit: ProductUnit.bottle, priceRange: [60, 120] },
  { name: "Cotton T-Shirt", category: "Fashion", subcategory: "Apparel", unit: ProductUnit.piece, priceRange: [199, 599] },
  { name: "Leather Wallet", category: "Fashion", subcategory: "Accessories", unit: ProductUnit.piece, priceRange: [299, 899] },
];

const MERCHANT_NAMES = [
  "Ravi Kumar",
  "Priya Sharma",
  "Arjun Reddy",
  "Sneha Patil",
  "Vikram Singh",
  "Anita Desai",
];

const BUYER_NAMES = [
  "Aditya Rao",
  "Meera Nair",
  "Karan Mehta",
  "Divya Iyer",
  "Rohit Verma",
  "Kavya Menon",
  "Sanjay Gupta",
  "Neha Joshi",
];

const STORE_NAME_PREFIXES = ["Sri", "New", "Modern", "City", "Royal", "Ganesh"];
const STORE_NAME_SUFFIXES = [
  "Traders",
  "General Store",
  "Mart",
  "Supermarket",
  "Enterprises",
  "Stores",
];

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------

async function clearDatabase() {
  console.log("Clearing existing data...");
  await prisma.payment.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.storeStaff.deleteMany();
  await prisma.store.deleteMany();
  await prisma.supplierProduct.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
}

async function seedSuppliers() {
  console.log("Seeding suppliers and wholesale catalogs...");

  const supplier1 = await prisma.supplier.create({
    data: {
      name: "Farm Fresh Dairies",
      companyName: "Farm Fresh Dairy Foods Pvt Ltd",
      phone: "+919876543210",
      email: "orders@farmfreshdairies.com",
      category: "Dairy",
      address: "Industrial Zone 4, Outer Ring Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560068",
      gstin: "29AAAAA0000A1Z5",
      rating: 4.9,
      paymentTerms: "Net 15",
      products: {
        create: [
          {
            name: "Organic Whole Milk (1L)",
            category: "Dairy",
            unit: ProductUnit.litre,
            wholesalePrice: new Prisma.Decimal(42.00),
            minOrderQty: new Prisma.Decimal(20),
            sku: "SUP-FLK-101",
            imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500"
          },
          {
            name: "Fresh Farm Butter (500g)",
            category: "Dairy",
            unit: ProductUnit.pack,
            wholesalePrice: new Prisma.Decimal(210.00),
            minOrderQty: new Prisma.Decimal(10),
            sku: "SUP-BTR-102",
            imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500"
          }
        ]
      }
    }
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      name: "Global Spices & Grains",
      companyName: "Global Spices & Agro Supplies Ltd",
      phone: "+919876543211",
      email: "b2b@globalspices.com",
      category: "Grocery",
      address: "APMC Wholesale Market, Yard 12",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400705",
      gstin: "27BBBBA1111B2Z6",
      rating: 4.8,
      paymentTerms: "Net 30",
      products: {
        create: [
          {
            name: "Royal Basmati Rice (25kg Bag)",
            category: "Grocery",
            unit: ProductUnit.box,
            wholesalePrice: new Prisma.Decimal(1850.00),
            minOrderQty: new Prisma.Decimal(2),
            sku: "SUP-RICE-201",
            imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500"
          },
          {
            name: "Toor Dal Premium (10kg)",
            category: "Grocery",
            unit: ProductUnit.pack,
            wholesalePrice: new Prisma.Decimal(950.00),
            minOrderQty: new Prisma.Decimal(3),
            sku: "SUP-DAL-202",
            imageUrl: "https://images.unsplash.com/photo-1585994191611-72ec0b4e2f89?w=500"
          }
        ]
      }
    }
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      name: "Organic Valley Co.",
      companyName: "Organic Valley Trading House",
      phone: "+919876543212",
      email: "supply@organicvalley.in",
      category: "Organic Foods",
      address: "Eco Tech Park, Block C",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      gstin: "36CCCCC2222C3Z7",
      rating: 5.0,
      paymentTerms: "Advance / COD",
      products: {
        create: [
          {
            name: "Raw Wildflower Honey (500g)",
            category: "Pantry",
            unit: ProductUnit.bottle,
            wholesalePrice: new Prisma.Decimal(320.00),
            minOrderQty: new Prisma.Decimal(6),
            sku: "SUP-HNY-301",
            imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500"
          }
        ]
      }
    }
  });

  return [supplier1, supplier2, supplier3];
}

async function seedUsers() {
  console.log("Seeding users...");

  const admin = await prisma.user.create({
    data: {
      role: "admin",
      name: "Admin User",
      phone: randomPhone(),
      preferredLanguage: "en",
    },
  });

  const merchants = [];
  let isFirstMerchant = true;
  for (const name of MERCHANT_NAMES) {
    const merchant = await prisma.user.create({
      data: {
        id: isFirstMerchant ? "merchant-123" : undefined,
        role: "merchant",
        name,
        phone: randomPhone(),
        preferredLanguage: randomItem(["en", "hi", "te", "ta"]),
      },
    });
    merchants.push(merchant);
    isFirstMerchant = false;
  }

  const buyers = [];
  for (const name of BUYER_NAMES) {
    const buyer = await prisma.user.create({
      data: {
        role: "buyer",
        name,
        phone: randomPhone(),
        preferredLanguage: randomItem(["en", "hi", "te", "ta"]),
      },
    });
    buyers.push(buyer);
  }

  return { admin, merchants, buyers };
}

async function seedStores(merchants: Awaited<ReturnType<typeof seedUsers>>["merchants"]) {
  console.log("Seeding stores...");

  const stores = [];
  for (const merchant of merchants) {
    const location = randomItem(CITIES);
    const store = await prisma.store.create({
      data: {
        ownerId: merchant.id,
        name: `${randomItem(STORE_NAME_PREFIXES)} ${randomItem(STORE_NAME_SUFFIXES)}`,
        description: `Trusted local business run by ${merchant.name}`,
        businessType: randomItem(BUSINESS_TYPES),
        address: `${randomInt(1, 200)}, Main Road, ${location.city}`,
        city: location.city,
        state: location.state,
        pincode: `${randomInt(500000, 600000)}`,
        lat: location.lat + (Math.random() - 0.5) * 0.05,
        lng: location.lng + (Math.random() - 0.5) * 0.05,
        status: StoreStatus.active,
      },
    });
    stores.push(store);
  }

  return stores;
}

async function seedProducts(stores: Awaited<ReturnType<typeof seedStores>>) {
  console.log("Seeding products...");

  const products = [];
  for (const store of stores) {
    // Each store gets a random subset of 6-10 products from the catalog
    const shuffled = [...PRODUCT_CATALOG].sort(() => Math.random() - 0.5);
    const selection = shuffled.slice(0, randomInt(6, 10));

    for (const item of selection) {
      const product = await prisma.product.create({
        data: {
          storeId: store.id,
          name: item.name,
          description: `${item.name} available at ${store.name}`,
          category: item.category,
          subcategory: item.subcategory,
          unit: item.unit,
          price: randomDecimal(item.priceRange[0], item.priceRange[1]),
          stockQty: randomDecimal(10, 500, 2),
          sku: `${item.category.slice(0, 3).toUpperCase()}-${randomInt(1000, 9999)}`,
          source: randomItem([
            ProductSource.manual,
            ProductSource.voice,
            ProductSource.image,
            ProductSource.excel,
          ]),
          isActive: Math.random() > 0.05,
        },
      });
      products.push(product);
    }
  }

  return products;
}

async function seedOrders(
  buyers: Awaited<ReturnType<typeof seedUsers>>["buyers"],
  stores: Awaited<ReturnType<typeof seedStores>>,
  products: Awaited<ReturnType<typeof seedProducts>>
) {
  console.log("Seeding orders, order items, and payments...");

  const statusPool: OrderStatus[] = [
    OrderStatus.draft,
    OrderStatus.confirmed,
    OrderStatus.paid,
    OrderStatus.failed,
    OrderStatus.fulfilled,
    OrderStatus.cancelled,
  ];

  for (const buyer of buyers) {
    const numOrders = randomInt(1, 4);

    for (let i = 0; i < numOrders; i++) {
      const store = randomItem(stores);
      const storeProducts = products.filter((p) => p.storeId === store.id);
      if (storeProducts.length === 0) continue;

      const status = randomItem(statusPool);
      const itemCount = randomInt(1, 4);
      const chosenProducts = [...storeProducts]
        .sort(() => Math.random() - 0.5)
        .slice(0, itemCount);

      const order = await prisma.order.create({
        data: {
          buyerId: buyer.id,
          storeId: store.id,
          status,
          totalAmount: 0,
        },
      });

      let total = new Prisma.Decimal(0);
      for (const product of chosenProducts) {
        const qty = randomDecimal(1, 5, 2);
        const lineTotal = product.price.mul(qty);
        total = total.add(lineTotal);

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            qty,
            priceAtPurchase: product.price,
          },
        });
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { totalAmount: total },
      });

      // Attach a payment for orders that reached paid/fulfilled/failed states
      if (
        status === OrderStatus.paid ||
        status === OrderStatus.fulfilled ||
        status === OrderStatus.failed
      ) {
        const paymentStatus =
          status === OrderStatus.failed ? PaymentStatus.failed : PaymentStatus.captured;

        await prisma.payment.create({
          data: {
            orderId: order.id,
            razorpayOrderId: `order_${randomInt(100000, 999999)}`,
            razorpayPaymentId:
              paymentStatus === PaymentStatus.captured
                ? `pay_${randomInt(100000, 999999)}`
                : null,
            status: paymentStatus,
            method: PaymentMethod.razorpay,
            amount: total,
            capturedAt: paymentStatus === PaymentStatus.captured ? new Date() : null,
          },
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await clearDatabase();

  const { merchants, buyers } = await seedUsers();
  const stores = await seedStores(merchants);
  const products = await seedProducts(stores);
  await seedOrders(buyers, stores, products);
  await seedSuppliers();

  console.log("Seeding complete.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });