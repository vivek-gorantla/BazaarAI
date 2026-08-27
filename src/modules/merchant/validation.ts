import { ApiError } from "../../middleware/errors.js";

const optionalStringFields = ["description", "city", "state", "pincode", "legalName", "tradingName", "taxId", "vatNumber", "businessEmail", "supportPhone", "bannerUrl", "logoUrl", "themeColor", "unit", "bankAccountNumber", "bankIfsc", "upiId"] as const;
const requiredStringFields = ["name", "businessType", "address"] as const;

function assertObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_REQUEST", "Request body must be an object");
  }
}

function assertString(value: unknown, field: string, required = false): void {
  if ((value === undefined || value === null) && !required) return;
  if (value === null && required) {
    throw new ApiError(400, "INVALID_REQUEST", `${field} must be a non-empty string`);
  }
  if (typeof value !== "string" || (required && value.trim() === "")) {
    throw new ApiError(400, "INVALID_REQUEST", `${field} must be a non-empty string`);
  }
}

function assertCoordinate(value: unknown, field: string, required = false): void {
  if (value === undefined && !required) return;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(400, "INVALID_REQUEST", `${field} must be a finite number`);
  }
}

function assertBoolean(value: unknown, field: string): void {
  if (value === undefined) return;
  if (typeof value !== "boolean") {
    throw new ApiError(400, "INVALID_REQUEST", `${field} must be a boolean`);
  }
}

export function validateCreateStore(body: unknown): Record<string, unknown> {
  assertObject(body);
  for (const field of requiredStringFields) assertString(body[field], field, true);
  for (const field of optionalStringFields) assertString(body[field], field);
  assertCoordinate(body.lat, "lat", true);
  assertCoordinate(body.lng, "lng", true);
  return body;
}

export function validateUpdateStore(body: unknown): Record<string, unknown> {
  assertObject(body);
  const allowedFields = new Set([...requiredStringFields, ...optionalStringFields, "lat", "lng", "deliveryRadius", "deliveryEnabled"]);
  for (const field of Object.keys(body)) {
    if (!allowedFields.has(field)) {
      throw new ApiError(400, "INVALID_REQUEST", `${field} cannot be updated`);
    }
  }
  for (const field of requiredStringFields) assertString(body[field], field);
  for (const field of optionalStringFields) assertString(body[field], field);
  assertCoordinate(body.lat, "lat");
  assertCoordinate(body.lng, "lng");
  assertCoordinate(body.deliveryRadius, "deliveryRadius");
  assertBoolean(body.deliveryEnabled, "deliveryEnabled");
  return body;
}
