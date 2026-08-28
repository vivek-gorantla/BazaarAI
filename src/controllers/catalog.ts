import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { bulkCreateProducts, createProduct, getProduct, listProducts, removeProduct, updateProduct, updateStock } from "../modules/catalog/products.js";
import { searchCatalog } from "../modules/catalog/search.js";

const id = (request: Request, name: string) => { const value = request.params[name]; return Array.isArray(value) ? value[0] : value; };
const owner = (request: Request) => (request as AuthenticatedRequest).user.id;

export async function postProduct(request: Request, response: Response) { response.status(201).json({ success: true, data: await createProduct(id(request, "storeId"), owner(request), request.body) }); }
export async function postBulkProducts(request: Request, response: Response) { response.status(201).json({ success: true, data: await bulkCreateProducts(id(request, "storeId"), owner(request), request.body) }); }
export async function getCatalog(request: Request, response: Response) { const result = await listProducts(id(request, "storeId"), owner(request), request.query as Record<string, unknown>); response.json({ success: true, data: result.data, pagination: result.pagination }); }
export async function getCatalogProduct(request: Request, response: Response) { response.json({ success: true, data: await getProduct(id(request, "storeId"), id(request, "productId"), owner(request)) }); }
export async function patchProduct(request: Request, response: Response) { response.json({ success: true, data: await updateProduct(id(request, "productId"), owner(request), request.body) }); }
export async function deleteProduct(request: Request, response: Response) { response.json({ success: true, ...await removeProduct(id(request, "productId"), owner(request)) }); }
export async function patchStock(request: Request, response: Response) { response.json({ success: true, data: await updateStock(id(request, "productId"), owner(request), request.body) }); }
export async function getSearch(request: Request, response: Response) {
  const query = request.query;
  const number = (value: unknown) => typeof value === "string" && Number.isFinite(Number(value)) ? Number(value) : undefined;
  response.json({ success: true, data: await searchCatalog({ query: typeof query.query === "string" ? query.query : undefined, category: typeof query.category === "string" ? query.category : undefined, subcategory: typeof query.subcategory === "string" ? query.subcategory : undefined, storeId: typeof query.storeId === "string" ? query.storeId : undefined, minPrice: number(query.minPrice), maxPrice: number(query.maxPrice), limit: number(query.limit), lat: number(query.lat), lng: number(query.lng), radiusKm: number(query.radiusKm) }) });
}
