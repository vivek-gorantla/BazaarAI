import { prisma } from "../../lib/prisma.js";

export async function listOrders(storeId: string) {
  const orders = await prisma.order.findMany({
    where: { storeId },
    include: {
      buyer: true,
      orderItems: {
        include: {
          product: true,
        },
      },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return orders;
}

export async function getDashboardMetrics(storeId: string) {
  const orders = await prisma.order.findMany({
    where: { storeId },
    include: {
      orderItems: true,
    },
  });

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const totalOrders = orders.length;

  const customers = new Set(orders.map((o) => o.buyerId)).size;

  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    metrics: [
      {
        title: "Revenue",
        value: `₹${totalRevenue.toLocaleString()}`,
        inc: "+0%",
        iconKey: "wallet",
        color: "primary",
      },
      {
        title: "Orders",
        value: totalOrders.toString(),
        inc: "+0%",
        iconKey: "shopping-bag",
        color: "primary",
      },
      {
        title: "Customers",
        value: customers.toString(),
        inc: "+0%",
        iconKey: "users",
        color: "secondary",
      },
      {
        title: "Avg Order",
        value: `₹${Math.round(avgOrder).toLocaleString()}`,
        inc: "+0%",
        iconKey: "receipt-text",
        color: "secondary",
      },
    ],
    trendingProducts: []
  };
}
