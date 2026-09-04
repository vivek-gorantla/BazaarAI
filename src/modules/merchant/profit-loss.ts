import { prisma } from "../../lib/prisma.js";

export async function getProfitLoss(storeId: string, merchantId: string) {
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

  // All orders this month and last month
  const thisMonthOrders = await prisma.order.findMany({
    where: { storeId: effectiveStoreId, createdAt: { gte: startOfMonth } },
    include: { orderItems: { include: { product: true } } },
  });

  const lastMonthOrders = await prisma.order.findMany({
    where: { storeId: effectiveStoreId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
    include: { orderItems: { include: { product: true } } },
  });

  const thisMonthRevenue = thisMonthOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);

  // Estimate COGS: sum of (price_at_purchase * qty) for all order items this month
  // COGS ≈ 65% of revenue (industry standard for retail), adjusted by actual data
  let thisMonthCogs = 0;
  for (const order of thisMonthOrders) {
    for (const item of order.orderItems) {
      // priceAtPurchase is the selling price — COGS is ~60-70% of selling price
      thisMonthCogs += Number(item.priceAtPurchase || 0) * Number(item.qty || 1) * 0.65;
    }
  }

  // Other estimated expenses
  const deliveryExpense = thisMonthRevenue * 0.04; // ~4% of revenue
  const marketingExpense = thisMonthRevenue * 0.02; // ~2% of revenue
  const staffExpense = thisMonthRevenue * 0.06; // ~6% of revenue

  const totalExpenses = thisMonthCogs + deliveryExpense + marketingExpense + staffExpense;
  const netProfit = thisMonthRevenue - totalExpenses;
  const profitMargin = thisMonthRevenue > 0 ? (netProfit / thisMonthRevenue) * 100 : 0;

  // Revenue trend
  let revenueTrend = "+0%";
  if (lastMonthRevenue > 0) {
    const change = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    revenueTrend = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  } else if (thisMonthRevenue > 0) {
    revenueTrend = "+100%";
  }

  // Monthly goal: 20% above last month's revenue, min ₹50,000
  const monthlyGoalAmount = Math.max(50000, lastMonthRevenue * 1.2);
  const goalReachedPct = monthlyGoalAmount > 0
    ? Math.min(100, Math.round((thisMonthRevenue / monthlyGoalAmount) * 100))
    : 0;
  const remaining = Math.max(0, monthlyGoalAmount - thisMonthRevenue);

  // AI insight
  let aiInsight = "Start taking orders to see profit & loss insights here.";
  if (thisMonthRevenue > 0) {
    if (deliveryExpense / totalExpenses > 0.08) {
      aiInsight = `Your logistics costs are <strong class="text-white">${((deliveryExpense / totalExpenses) * 100).toFixed(0)}% of expenses</strong> this month. Review delivery partner rates to improve margins.`;
    } else if (profitMargin > 20) {
      aiInsight = `Excellent! Your profit margin is <strong class="text-white">${profitMargin.toFixed(1)}%</strong> this month — well above the retail average of 10-15%.`;
    } else {
      aiInsight = `Your current margin is <strong class="text-white">${profitMargin.toFixed(1)}%</strong>. Focus on reducing COGS by negotiating better supplier rates.`;
    }
  }

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  return {
    metrics: {
      revenue: {
        title: "Total Revenue",
        value: fmt(thisMonthRevenue),
        trend: revenueTrend,
        trendText: "vs last month",
        icon: "arrow_upward",
        iconBgClass: "bg-surface-container",
        iconColorClass: "text-primary",
        bgClass: "bg-surface-container-lowest",
      },
      expenses: {
        title: "Total Expenses",
        value: fmt(totalExpenses),
        trend: totalExpenses > 0 ? "Est." : "+0%",
        trendText: "estimated",
        icon: "arrow_downward",
        iconBgClass: "bg-surface-container",
        iconColorClass: "text-error",
        bgClass: "bg-surface-container-lowest",
      },
      profit: {
        value: fmt(Math.max(0, netProfit)),
        margin: `${profitMargin.toFixed(1)}% Margin`,
      },
    },
    expensesBreakdown: {
      total: `${fmt(totalExpenses)} (Estimated Total)`,
      items: [
        {
          id: "1",
          name: "Product Cost (COGS)",
          percentage: totalExpenses > 0 ? `${((thisMonthCogs / totalExpenses) * 100).toFixed(1)}%` : "0%",
          amount: fmt(thisMonthCogs),
          icon: "inventory_2",
          iconBgClass: "bg-primary/10",
          iconColorClass: "text-primary",
          dotClass: "bg-primary",
        },
        {
          id: "2",
          name: "Staff & Operations",
          percentage: totalExpenses > 0 ? `${((staffExpense / totalExpenses) * 100).toFixed(1)}%` : "0%",
          amount: fmt(staffExpense),
          icon: "groups",
          iconBgClass: "bg-secondary/10",
          iconColorClass: "text-secondary",
          dotClass: "bg-secondary",
        },
        {
          id: "3",
          name: "Delivery & Logistics",
          percentage: totalExpenses > 0 ? `${((deliveryExpense / totalExpenses) * 100).toFixed(1)}%` : "0%",
          amount: fmt(deliveryExpense),
          icon: "local_shipping",
          iconBgClass: "bg-tertiary/10",
          iconColorClass: "text-tertiary",
          dotClass: "bg-tertiary",
        },
        {
          id: "4",
          name: "Marketing",
          percentage: totalExpenses > 0 ? `${((marketingExpense / totalExpenses) * 100).toFixed(1)}%` : "0%",
          amount: fmt(marketingExpense),
          icon: "campaign",
          iconBgClass: "bg-secondary-fixed/50",
          iconColorClass: "text-secondary",
          dotClass: "bg-secondary-fixed",
        },
      ],
    },
    monthlyGoal: {
      target: fmt(monthlyGoalAmount),
      reachedPercentage: `${goalReachedPct}% Reached`,
      remaining: fmt(remaining),
    },
    aiInsight,
  };
}
