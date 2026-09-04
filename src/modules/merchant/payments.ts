import { prisma } from "../../lib/prisma.js";

export async function getPayments(storeId: string, merchantId: string) {
  // Resolve store
  let store = await prisma.store.findFirst({ where: { id: storeId } });
  if (!store) {
    store = await prisma.store.findFirst({ where: { ownerId: merchantId } });
  }
  const effectiveStoreId = store?.id ?? storeId;

  // Fetch all orders with payments
  const orders = await prisma.order.findMany({
    where: { storeId: effectiveStoreId },
    include: {
      payment: true,
      orderItems: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Date boundaries
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(startOfToday);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayOrders = orders.filter(o => new Date(o.createdAt) >= startOfToday);
  const yesterdayOrders = orders.filter(
    o => new Date(o.createdAt) >= yesterday && new Date(o.createdAt) < startOfToday
  );

  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  
  let todayTrend = "+0% vs yesterday";
  if (yesterdayRevenue > 0) {
    const change = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
    todayTrend = `${change >= 0 ? "+" : ""}${change.toFixed(0)}% vs yesterday`;
  } else if (todayRevenue > 0) {
    todayTrend = "First sales today!";
  }

  // Pending settlements: orders from last 3 days not yet "delivered"
  const threeDaysAgo = new Date(startOfToday);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const pendingOrders = orders.filter(
    o => new Date(o.createdAt) >= threeDaysAgo && (o.status as string) !== "delivered" && o.status !== "fulfilled"
  );
  const pendingAmount = pendingOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);

  // Last settlement: most recent delivered orders day
  const deliveredOrders = orders.filter(o => (o.status as string) === "delivered" || o.status === "fulfilled");
  const lastSettlementDate = deliveredOrders.length > 0
    ? new Date(deliveredOrders[0].createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "No settlements yet";
  const lastSettlementAmount = deliveredOrders
    .filter(o => {
      const created = new Date(o.createdAt);
      const lastDate = deliveredOrders.length > 0 ? new Date(deliveredOrders[0].createdAt) : new Date();
      const sameDay = created.toDateString() === lastDate.toDateString();
      return sameDay;
    })
    .reduce((s, o) => s + Number(o.totalAmount || 0), 0);

  // Build schedule
  const schedule = [];
  if (lastSettlementAmount > 0) {
    schedule.push({
      id: "1",
      type: "settled" as const,
      statusText: `${lastSettlementDate} — Settled`,
      amount: `₹${lastSettlementAmount.toLocaleString("en-IN")}`,
      details: "Delivered orders",
      icon: "account_balance",
    });
  }
  if (pendingAmount > 0) {
    schedule.push({
      id: "2",
      type: "processing" as const,
      statusText: "Pending — Processing",
      amount: `₹${pendingAmount.toLocaleString("en-IN")}`,
      details: `${pendingOrders.length} orders in progress`,
      icon: "",
    });
  }
  if (schedule.length === 0) {
    schedule.push({
      id: "1",
      type: "projected" as const,
      statusText: "No settlements yet",
      amount: "₹0",
      details: "Start receiving orders to see settlements",
      icon: "",
    });
  }

  // Build transactions list from real orders
  const methodMap: Record<string, { icon: string; label: string }> = {
    UPI: { icon: "qr_code_scanner", label: "UPI" },
    CASH: { icon: "payments", label: "Cash" },
    CARD: { icon: "credit_card", label: "Card" },
    ONLINE: { icon: "qr_code_scanner", label: "Online" },
  };

  const transactions = orders.slice(0, 20).map((o, i) => {
    const method = (o.payment?.method ?? "CASH").toUpperCase();
    const methodInfo = methodMap[method] ?? { icon: "payments", label: method };
    const isPaid = (o.payment?.status as string) === "paid" || (o.payment?.status as string) === "captured" || o.status === "fulfilled" || (o.status as string) === "delivered" || (o.status as string) === "ready";
    const isProcessing = !isPaid && o.status !== "cancelled";
    const dateObj = new Date(o.createdAt);
    const dateStr = dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const timeStr = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    return {
      id: String(i + 1),
      date: dateStr,
      time: timeStr,
      orderId: "#" + o.id.substring(0, 8).toUpperCase(),
      method: methodInfo.label,
      methodIcon: methodInfo.icon,
      status: isPaid ? "Success" : isProcessing ? "Processing" : "Cancelled",
      statusClass: isPaid
        ? "bg-primary-fixed/30 text-on-primary-fixed-variant"
        : isProcessing
          ? "bg-secondary-fixed/50 text-secondary"
          : "bg-error/10 text-error",
      statusDotClass: isPaid
        ? "bg-primary"
        : isProcessing
          ? "bg-secondary animate-pulse"
          : "bg-error",
      amount: `₹${Number(o.totalAmount).toLocaleString("en-IN")}`,
      isBgLowest: i % 2 === 1,
    };
  });

  return {
    metrics: {
      todayRevenue: `₹${todayRevenue.toLocaleString("en-IN")}`,
      todayRevenueTrend: todayTrend,
      pendingSettlements: `₹${pendingAmount.toLocaleString("en-IN")}`,
      pendingSettlementsSub: `${pendingOrders.length} orders`,
      lastSettlement: lastSettlementAmount > 0 ? `₹${lastSettlementAmount.toLocaleString("en-IN")}` : "₹0",
      lastSettlementDate,
    },
    schedule,
    transactions,
  };
}
