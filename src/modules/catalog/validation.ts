import { ProductSource, ProductUnit } from "../../generated/prisma/client.js";
import { ApiError } from "../../middleware/errors.js";

const units = new Set(Object.values(ProductUnit));
const sources = new Set(Object.values(ProductSource));

function objectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "INVALID_REQUEST", "Request body must be an object");
  return body as Record<string, unknown>;
}

function stringField(value: unknown, field: string, required = false): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || (required && !value.trim())) throw new ApiError(400, "INVALID_REQUEST", `${field} must be a non-empty string`);
  return value;
}

function numberField(value: unknown, field: string, required = false): number | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new ApiError(400, "INVALID_REQUEST", `${field} must be a non-negative number`);
  return value;
}

export function validateProduct(body: unknown, partial: boolean) {
  const input = objectBody(body);
  const allowed = ["name", "description", "category", "subcategory", "unit", "price", "stockQty", "sku", "imageUrl", "attributes", "source", "isActive"];
  for (const field of Object.keys(input)) if (!allowed.includes(field)) throw new ApiError(400, "INVALID_REQUEST", `${field} cannot be updated`);
  const name = stringField(input.name, "name", !partial);
  const category = stringField(input.category, "category", !partial);
  const unit = stringField(input.unit, "unit", !partial);
  if (unit && !units.has(unit as ProductUnit)) throw new ApiError(400, "INVALID_REQUEST", "unit is invalid");
  let source = stringField(input.source, "source");
  if (source) {
    const normalized = source.toLowerCase();
    if (sources.has(normalized as ProductSource)) {
      source = normalized;
    } else if (normalized.includes("voice")) {
      source = "voice";
    } else if (normalized.includes("image") || normalized.includes("camera") || normalized.includes("snap")) {
      source = "image";
    } else if (normalized.includes("excel") || normalized.includes("csv")) {
      source = "excel";
    } else {
      source = "manual";
    }
  }
  const price = numberField(input.price, "price", !partial);
  const stockQty = numberField(input.stockQty, "stockQty");
  if (input.isActive !== undefined && typeof input.isActive !== "boolean") throw new ApiError(400, "INVALID_REQUEST", "isActive must be boolean");
  if (input.attributes !== undefined && (typeof input.attributes !== "object" || input.attributes === null)) throw new ApiError(400, "INVALID_REQUEST", "attributes must be an object");
  input.name = name;
  input.category = category;
  input.unit = unit;
  input.price = price;
  input.stockQty = stockQty;
  input.source = source;
  return input;
}

export function validateStock(body: unknown): number {
  const input = objectBody(body);
  if (typeof input.stockQty !== "number" || !Number.isFinite(input.stockQty) || input.stockQty < 0) throw new ApiError(400, "INVALID_REQUEST", "stockQty must be a non-negative number");
  return input.stockQty;
}
