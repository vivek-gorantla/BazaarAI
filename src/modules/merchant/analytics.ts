import { prisma } from "../../lib/prisma.js";

export async function getAnalytics(storeId: string, merchantId: string) {
  // Resolve store
  let store = await prisma.store.findFirst({ where: { id: storeId } });
  if (!store) {
    store = await prisma.store.findFirst({ where: { ownerId: merchantId } });
  }
  const effectiveStoreId = store?.id ?? storeId;

  // Fetch all orders with items and products
  const allOrders = await prisma.order.findMany({
    where: { storeId: effectiveStoreId },
    include: {
      orderItems: { include: { product: true } },
      buyer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Date boundaries
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThisWeek = new Date(startOfToday);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay());
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const thisWeekOrders = allOrders.filter(o => new Date(o.createdAt) >= startOfThisWeek);
  const lastWeekOrders = allOrders.filter(
    o => new Date(o.createdAt) >= startOfLastWeek && new Date(o.createdAt) < startOfThisWeek
  );

  const totalRevenue = allOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const thisWeekRevenue = thisWeekOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const lastWeekRevenue = lastWeekOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);

  // Revenue trend
  let revenueTrend = "+0%";
  if (lastWeekRevenue > 0) {
    const change = ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;
    revenueTrend = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  } else if (thisWeekRevenue > 0) {
    revenueTrend = "+100%";
  }

  // Peak day: find which day of week has highest revenue
  const dayRevenue: Record<string, number> = {};
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  for (const o of allOrders) {
    const dayName = dayNames[new Date(o.createdAt).getDay()];
    dayRevenue[dayName] = (dayRevenue[dayName] || 0) + Number(o.totalAmount || 0);
  }
  const peakDay = Object.entries(dayRevenue).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  const peakDayRevenue = dayRevenue[peakDay] ?? 0;

  // Unique customers
  const uniqueBuyerIds = new Set(allOrders.map(o => o.buyerId));
  const thisWeekBuyerIds = new Set(thisWeekOrders.map(o => o.buyerId));
  const lastWeekBuyerIds = new Set(lastWeekOrders.map(o => o.buyerId));
  const newThisWeek = [...thisWeekBuyerIds].filter(id => !lastWeekBuyerIds.has(id)).length;
  const newPct = thisWeekBuyerIds.size > 0
    ? `${Math.round((newThisWeek / thisWeekBuyerIds.size) * 100)}% New`
    : "0% New";

  // Top products by revenue
  const productRevenue: Record<string, { name: string; revenue: number; units: number; category: string; imageUrl?: string | null }> = {};
  for (const order of allOrders) {
    for (const item of order.orderItems) {
      const pid = item.productId;
      if (!pid) continue;
      const pname = item.product?.name ?? "Unknown";
      const cat = item.product?.category ?? "General";
      const img = item.product?.imageUrl ?? null;
      const rev = Number(item.priceAtPurchase || 0) * Number(item.qty || 1);
      if (!productRevenue[pid]) {
        productRevenue[pid] = { name: pname, revenue: 0, units: 0, category: cat, imageUrl: img };
      }
      productRevenue[pid].revenue += rev;
      productRevenue[pid].units += Number(item.qty || 1);
    }
  }

  const topProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([id, p], i) => {
      const trendIcons = ["trending_up", "trending_up", "trending_up", "trending_flat", "trending_down"];
      const trendClasses = [
        "text-primary bg-primary-container/50",
        "text-primary bg-primary-container/50",
        "text-primary bg-primary-container/50",
        "text-outline bg-surface-variant/50",
        "text-error bg-error-container/50",
      ];
      return {
        id,
        image: p.imageUrl ?? "",
        title: p.name,
        subtitle: `${p.category} • ${p.units} units`,
        revenue: `₹${p.revenue.toLocaleString("en-IN")}`,
        trendValue: i === 0 ? revenueTrend : `${Math.max(1, Math.floor(p.units / Math.max(1, allOrders.length) * 10))}%`,
        trendIcon: trendIcons[i] ?? "trending_up",
        trendClass: trendClasses[i] ?? "text-primary bg-primary-container/50",
      };
    });

  // Smart insight
  let insightHtml = "Start taking orders to see revenue insights here.";
  if (totalRevenue > 0) {
    if (peakDay !== "N/A") {
      insightHtml = `Your <strong class="font-bold">${peakDay}</strong> sales are your highest revenue day. Consider launching promotions early that day to capture more demand.`;
    } else {
      insightHtml = `You have generated <strong class="font-bold">₹${totalRevenue.toLocaleString("en-IN")}</strong> in total revenue. Keep adding products to grow faster.`;
    }
  }

  return {
    revenue: {
      total: `₹${totalRevenue.toLocaleString("en-IN")}`,
      increase: revenueTrend,
      peakDay: `₹${peakDayRevenue.toLocaleString("en-IN")} on ${peakDay}`,
    },
    insight: {
      title: totalRevenue > 0 ? "Smart Insight" : "Getting Started",
      descriptionHtml: insightHtml,
    },
    topProducts,
    customers: {
      total: uniqueBuyerIds.size.toLocaleString("en-IN"),
      newPercentage: newPct,
    },
  };
}
