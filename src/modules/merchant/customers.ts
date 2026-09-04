import { prisma } from "../../lib/prisma.js";

export async function getCustomers(storeId: string, merchantId: string) {
  // Resolve store
  let store = await prisma.store.findFirst({ where: { id: storeId } });
  if (!store) {
    store = await prisma.store.findFirst({ where: { ownerId: merchantId } });
  }
  const effectiveStoreId = store?.id ?? storeId;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(startOfMonth.getTime() - 1);

  // All orders with buyer info
  const allOrders = await prisma.order.findMany({
    where: { storeId: effectiveStoreId },
    include: { buyer: true, orderItems: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  const thisMonthOrders = allOrders.filter(o => new Date(o.createdAt) >= startOfMonth);
  const lastMonthOrders = allOrders.filter(
    o => new Date(o.createdAt) >= startOfLastMonth && new Date(o.createdAt) < startOfMonth
  );

  // Build customer map: buyerId → { name, phone, orders[], totalSpend }
  const customerMap: Record<string, {
    name: string; phone: string; email?: string;
    orderCount: number; totalSpend: number;
    firstOrderDate: Date; lastOrderDate: Date;
    categories: Set<string>;
  }> = {};

  for (const order of allOrders) {
    const bid = order.buyerId;
    if (!customerMap[bid]) {
      customerMap[bid] = {
        name: order.buyer?.name ?? "Customer",
        phone: order.buyer?.phone ?? "",
        email: (order.buyer as any)?.email ?? "",
        orderCount: 0,
        totalSpend: 0,
        firstOrderDate: new Date(order.createdAt),
        lastOrderDate: new Date(order.createdAt),
        categories: new Set(),
      };
    }
    customerMap[bid].orderCount++;
    customerMap[bid].totalSpend += Number(order.totalAmount || 0);
    const created = new Date(order.createdAt);
    if (created < customerMap[bid].firstOrderDate) customerMap[bid].firstOrderDate = created;
    if (created > customerMap[bid].lastOrderDate) customerMap[bid].lastOrderDate = created;
    for (const item of order.orderItems) {
      if (item.product?.category) customerMap[bid].categories.add(item.product.category);
    }
  }

  const allCustomers = Object.entries(customerMap);
  const totalCustomers = allCustomers.length;

  // New customers this month (first order in this month)
  const newThisMonth = allCustomers.filter(([, c]) => c.firstOrderDate >= startOfMonth).length;
  const newLastMonth = allCustomers.filter(
    ([, c]) => c.firstOrderDate >= startOfLastMonth && c.firstOrderDate < startOfMonth
  ).length;

  // Returning: had orders in both months
  const thisMonthBuyers = new Set(thisMonthOrders.map(o => o.buyerId));
  const lastMonthBuyers = new Set(lastMonthOrders.map(o => o.buyerId));
  const returning = [...thisMonthBuyers].filter(id => lastMonthBuyers.has(id)).length;

  // Repeat rate: customers with >1 order / total
  const repeatCount = allCustomers.filter(([, c]) => c.orderCount > 1).length;
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCount / totalCustomers) * 100) : 0;

  // Trends
  const newTrend = newLastMonth > 0
    ? `${newThisMonth >= newLastMonth ? "+" : ""}${Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)}%`
    : newThisMonth > 0 ? "+100%" : "0%";

  // Color classes for initials
  const bgClasses = [
    "bg-primary-fixed", "bg-secondary-fixed", "bg-tertiary-container",
    "bg-surface-container-highest", "bg-primary-container", "bg-secondary-container"
  ];
  const colorClasses = [
    "text-on-primary-fixed", "text-on-secondary-fixed", "text-on-tertiary-container",
    "text-on-surface", "text-on-primary-container", "text-on-secondary-container"
  ];

  // Top regulars (sorted by order count)
  const sorted = [...allCustomers].sort((a, b) => b[1].orderCount - a[1].orderCount);
  const regulars = sorted.slice(0, 6).map(([id, c], i) => ({
    id,
    name: c.name,
    orders: `${c.orderCount} Order${c.orderCount !== 1 ? "s" : ""}`,
    badge: c.orderCount >= 5 ? "VIP Member" : c.orderCount >= 2 ? "Regular" : "New",
    badgeClass: c.orderCount >= 5
      ? "bg-secondary-container text-on-secondary-container"
      : c.orderCount >= 2
        ? "bg-primary-container text-on-primary-container"
        : "bg-tertiary-container text-on-tertiary-container",
    initial: c.name.charAt(0).toUpperCase(),
    initialBgClass: bgClasses[i % bgClasses.length] + " " + colorClasses[i % colorClasses.length],
  }));

  // Directory: all customers
  const directory = sorted.slice(0, 20).map(([id, c], i) => ({
    id,
    name: c.name,
    email: c.email || `${c.phone}@bazaar.local`,
    orders: String(c.orderCount),
    spend: `₹${c.totalSpend.toLocaleString("en-IN")}`,
    category: [...c.categories][0] ?? "General",
    badge: c.orderCount >= 5 ? "VIP" : c.orderCount >= 2 ? "Regular" : "New",
    badgeClass: c.orderCount >= 5
      ? "bg-secondary-container text-on-secondary-container"
      : c.orderCount >= 2
        ? "bg-primary-container text-on-primary-container"
        : "bg-tertiary-container text-on-tertiary-container",
    initial: c.name.charAt(0).toUpperCase(),
    initialBgClass: bgClasses[i % bgClasses.length],
    initialColorClass: colorClasses[i % colorClasses.length],
  }));

  return {
    metrics: [
      {
        id: "1",
        label: "Total Customers",
        value: totalCustomers.toLocaleString("en-IN"),
        trend: "+0%",
        icon: "groups",
        iconBgClass: "bg-primary-container",
        iconColorClass: "text-on-primary-container",
        svgColorClass: "text-primary",
      },
      {
        id: "2",
        label: "New Customers",
        value: String(newThisMonth),
        trend: newTrend,
        icon: "person_add",
        iconBgClass: "bg-secondary-container",
        iconColorClass: "text-on-secondary-container",
        svgColorClass: "text-secondary",
      },
      {
        id: "3",
        label: "Returning",
        value: String(returning),
        trend: "+0%",
        icon: "loop",
        iconBgClass: "bg-tertiary-container",
        iconColorClass: "text-on-tertiary-container",
        svgColorClass: "text-tertiary",
      },
      {
        id: "4",
        label: "Repeat Rate",
        value: `${repeatRate}%`,
        trend: repeatRate >= 50 ? "Excellent" : repeatRate >= 25 ? "Good" : "Growing",
        icon: "favorite",
        iconBgClass: "bg-on-primary/20",
        iconColorClass: "text-on-primary",
        svgColorClass: "text-primary-fixed",
        isProgressBar: true,
        progressValue: `${repeatRate}%`,
      },
    ],
    regulars,
    directory,
  };
}
