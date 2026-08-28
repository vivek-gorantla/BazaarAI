import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function getSuppliers(req: Request, res: Response): Promise<void> {
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;

  const where: any = {};

  if (category && category !== "All") {
    where.category = { contains: category, mode: "insensitive" };
  }

  if (search && search.trim()) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } }
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      products: true
    },
    orderBy: { rating: "desc" }
  });

  res.json({
    success: true,
    data: suppliers
  });
}

export async function getSupplierById(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      products: true
    }
  });

  if (!supplier) {
    res.status(404).json({ success: false, error: "Supplier not found" });
    return;
  }

  res.json({
    success: true,
    data: supplier
  });
}

export async function createSupplier(req: Request, res: Response): Promise<void> {
  const { name, companyName, phone, email, category, address, city, state, pincode, gstin, paymentTerms } = req.body;

  if (!name || !phone) {
    res.status(400).json({ success: false, error: "Name and phone are required" });
    return;
  }

  const supplier = await prisma.supplier.create({
    data: {
      name,
      companyName,
      phone,
      email,
      category,
      address,
      city,
      state,
      pincode,
      gstin,
      paymentTerms
    }
  });

  res.status(201).json({
    success: true,
    data: supplier
  });
}

export async function addSupplierProduct(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { name, description, category, unit, wholesalePrice, minOrderQty, sku, imageUrl } = req.body;

  if (!name || wholesalePrice === undefined) {
    res.status(400).json({ success: false, error: "Name and wholesale price are required" });
    return;
  }

  const product = await prisma.supplierProduct.create({
    data: {
      supplierId: id,
      name,
      description,
      category: category || "General",
      unit: unit || "piece",
      wholesalePrice: Number(wholesalePrice),
      minOrderQty: minOrderQty ? Number(minOrderQty) : 1,
      sku,
      imageUrl
    }
  });

  res.status(201).json({
    success: true,
    data: product
  });
}
