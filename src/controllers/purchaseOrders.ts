import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function getPurchaseOrders(req: Request, res: Response): Promise<void> {
  const storeId = req.params.storeId as string;

  const orders = await prisma.purchaseOrder.findMany({
    where: { storeId },
    include: {
      supplier: true,
      items: true
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({
    success: true,
    data: orders
  });
}

export async function createPurchaseOrder(req: Request, res: Response): Promise<void> {
  const storeId = req.params.storeId as string;
  const { supplierId, items, notes, expectedDelivery } = req.body;

  if (!supplierId || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: "Supplier ID and at least one item are required" });
    return;
  }

  const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  let totalAmount = 0;
  const formattedItems = items.map((i: any) => {
    const qty = Number(i.qty) || 1;
    const unitPrice = Number(i.unitPrice || i.price) || 0;
    const totalPrice = qty * unitPrice;
    totalAmount += totalPrice;

    return {
      productId: i.productId || null,
      supplierProductId: i.supplierProductId || null,
      name: i.name,
      qty,
      unitPrice,
      totalPrice
    };
  });

  const order = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      storeId,
      supplierId,
      status: "sent",
      totalAmount,
      notes,
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      items: {
        create: formattedItems
      }
    },
    include: {
      supplier: true,
      items: true
    }
  });

  res.status(201).json({
    success: true,
    data: order
  });
}

export async function receivePurchaseOrder(req: Request, res: Response): Promise<void> {
  const storeId = req.params.storeId as string;
  const poId = req.params.poId as string;

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, storeId },
    include: { items: true }
  });

  if (!po) {
    res.status(404).json({ success: false, error: "Purchase Order not found" });
    return;
  }

  if (po.status === "received") {
    res.status(400).json({ success: false, error: "Purchase Order has already been received" });
    return;
  }

  // Transaction: Update PO status to received and update product stock in DB
  await prisma.$transaction(async (tx) => {
    // 1. Update PO status
    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: "received" }
    });

    // 2. Replenish stock for each item
    for (const item of po.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQty: { increment: item.qty }
          }
        });
      } else {
        // Try finding product by name in store
        const existing = await tx.product.findFirst({
          where: { storeId, name: { equals: item.name, mode: "insensitive" } }
        });

        if (existing) {
          await tx.product.update({
            where: { id: existing.id },
            data: {
              stockQty: { increment: item.qty }
            }
          });
        }
      }
    }
  });

  res.json({
    success: true,
    message: "Shipment received and inventory stock levels updated successfully"
  });
}
