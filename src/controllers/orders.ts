import type { Request, Response } from "express";
import { getDashboardMetrics, listOrders } from "../modules/merchant/orders.js";

function storeId(request: Request): string {
  const value = request.params.storeId;
  return Array.isArray(value) ? value[0] : value;
}

export async function getOrders(request: Request, response: Response): Promise<void> {
  const orders = await listOrders(storeId(request));
  response.json({ success: true, data: orders });
}

export async function getDashboard(request: Request, response: Response): Promise<void> {
  const dashboard = await getDashboardMetrics(storeId(request));
  response.json({ success: true, data: dashboard });
}
