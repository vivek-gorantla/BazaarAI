import { parse } from "csv-parse/sync";

export interface ParsedProduct {
  name: string;
  description: string;
  category: string;
  unit: string;

  price: number | null;
  stockQty: number | null;

  attributes: {
    name: string;
    value: string;
  }[];

  productSource: "csv";

  sku: string | null;
  brand: string | null;
}

export interface CsvParseError {
  row: number;
  field?: string;
  value?: string;
  message: string;
}

export interface ParseCsvResult {
  products: ParsedProduct[];
  errors: CsvParseError[];
  totalRows: number;
  successfulRows: number;
  failedRows: number;
}

const UNIT_ALIASES: Record<string, string> = {
  kg: "kg",
  kgs: "kg",
  kilogram: "kg",
  kilograms: "kg",

  g: "gram",
  gram: "gram",
  grams: "gram",

  l: "litre",
  liter: "litre",
  litre: "litre",
  liters: "litre",
  litres: "litre",

  ml: "ml",
  milliliter: "ml",
  millilitre: "ml",

  tonne: "tonne",
  tonnes: "tonne",
  meter: "meter",
  meters: "meter",
  cm: "cm",
  pack: "pack",
  packs: "pack",
  box: "box",
  boxes: "box",
  pair: "pair",
  pairs: "pair",
  piece: "piece",
  pieces: "piece",
  pcs: "piece",
  pc: "piece",
};

/**
 * Normalizes string values by trimming whitespace and collapsing multiple internal spaces.
 * Does NOT alter character casing.
 */
function normalizeText(value?: string): string {
  if (!value) return "";
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Parses numeric values from strings, handling currency symbols (₹, $, €, £),
 * currency prefixes (Rs., INR, etc.), and commas.
 */
function parseNumber(value?: string): { val: number | null; valid: boolean } {
  if (value === undefined || value === null) return { val: null, valid: true };
  const normalized = value.trim();
  if (normalized === "") return { val: null, valid: true };

  // Remove currency symbols, commas, and currency prefixes
  const cleaned = normalized
    .replace(/,/g, "")
    .replace(/[₹$€£]/g, "")
    .replace(/\b(Rs\.|Rs|INR|USD|EUR|GBP)\b/gi, "")
    .trim();

  if (cleaned === "") return { val: null, valid: false };

  const num = Number(cleaned);
  if (isNaN(num)) {
    return { val: null, valid: false };
  }

  return { val: num, valid: true };
}

/**
 * Normalizes unit values to standard Bazaar units (kg, gram, litre, ml, etc.)
 */
function normalizeUnit(value?: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const lower = trimmed.toLowerCase();
  if (UNIT_ALIASES[lower]) {
    return UNIT_ALIASES[lower];
  }

  return normalizeText(trimmed);
}

/**
 * Parses key-value attribute pairs separated by ';' and '='.
 * Example: "weight=5 kg;type=basmati" => [{ name: "weight", value: "5 kg" }, { name: "type", value: "basmati" }]
 */
function parseAttributes(raw?: string): {
  attributes: { name: string; value: string }[];
  errors: string[];
} {
  const result: { name: string; value: string }[] = [];
  const errors: string[] = [];
  if (!raw) return { attributes: result, errors };

  const parts = raw.split(";");
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    const equalsIdx = trimmedPart.indexOf("=");
    if (equalsIdx === -1) {
      errors.push(`Malformed attribute '${trimmedPart}': missing '=' delimiter`);
      continue;
    }

    const name = normalizeText(trimmedPart.slice(0, equalsIdx));
    const value = normalizeText(trimmedPart.slice(equalsIdx + 1));

    if (!name) {
      errors.push(`Malformed attribute '${trimmedPart}': attribute name is empty`);
      continue;
    }

    result.push({ name, value });
  }

  return { attributes: result, errors };
}

/**
 * Normalizes CSV header names to standardized property keys.
 */
function normalizeHeaderKey(header: string): string {
  const cleaned = header.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (cleaned === "name" || cleaned === "productname" || cleaned === "itemname") return "name";
  if (cleaned === "description" || cleaned === "desc" || cleaned === "details") return "description";
  if (cleaned === "category" || cleaned === "cat") return "category";
  if (cleaned === "unit" || cleaned === "units" || cleaned === "uom") return "unit";
  if (cleaned === "price" || cleaned === "mrp" || cleaned === "cost" || cleaned === "rate") return "price";
  if (cleaned === "stockqty" || cleaned === "stock" || cleaned === "qty" || cleaned === "quantity" || cleaned === "stockquantity") return "stockQty";
  if (cleaned === "attributes" || cleaned === "attribute" || cleaned === "attrs") return "attributes";
  if (cleaned === "sku" || cleaned === "code" || cleaned === "itemcode") return "sku";
  if (cleaned === "brand" || cleaned === "company" || cleaned === "make") return "brand";
  return header.trim();
}

async function csvInputToString(input: string | File | Blob | Buffer): Promise<string> {
  if (typeof input === "string") {
    return input;
  }
  if (Buffer.isBuffer(input)) {
    return input.toString("utf-8");
  }
  if ("text" in input && typeof (input as File | Blob).text === "function") {
    return await (input as File | Blob).text();
  }
  const arrayBuffer = await (input as Blob).arrayBuffer();
  return Buffer.from(arrayBuffer).toString("utf-8");
}

/**
 * Synchronous parser for CSV text string.
 */
export function parseCsvProductsSync(csvText: string): ParseCsvResult {
  if (!csvText || !csvText.trim()) {
    return {
      products: [],
      errors: [{ row: 1, message: "CSV content is empty" }],
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
    };
  }

  let rawRows: string[][];
  try {
    rawRows = parse(csvText, {
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  } catch (err: any) {
    return {
      products: [],
      errors: [{ row: 1, message: `CSV parsing failed: ${err?.message || String(err)}` }],
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
    };
  }

  if (!rawRows || rawRows.length === 0) {
    return {
      products: [],
      errors: [{ row: 1, message: "CSV content contains no rows" }],
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
    };
  }

  // Row 1: Headers
  const headerRow = rawRows[0];
  const normalizedHeaders = headerRow.map((h) => normalizeHeaderKey(h));

  // Check required 'name' header
  if (!normalizedHeaders.includes("name")) {
    return {
      products: [],
      errors: [
        {
          row: 1,
          field: "name",
          message: "Required CSV column 'name' is missing",
        },
      ],
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
    };
  }

  const dataRows = rawRows.slice(1);
  const totalRows = dataRows.length;
  const products: ParsedProduct[] = [];
  const errors: CsvParseError[] = [];
  let successfulRows = 0;
  let failedRows = 0;

  dataRows.forEach((rowValues, idx) => {
    const rowNumber = idx + 2; // Header is row 1, data rows start at row 2

    // Map row columns by header name
    const rowData: Record<string, string> = {};
    normalizedHeaders.forEach((headerKey, colIdx) => {
      rowData[headerKey] = rowValues[colIdx] !== undefined ? rowValues[colIdx] : "";
    });

    let hasRowError = false;

    // Validate & Normalize Name
    const rawName = rowData["name"];
    const name = normalizeText(rawName);
    if (!name) {
      errors.push({
        row: rowNumber,
        field: "name",
        value: rawName || "",
        message: "Product name is required",
      });
      hasRowError = true;
    }

    // Validate & Normalize Price
    const rawPrice = rowData["price"];
    const priceRes = parseNumber(rawPrice);
    if (!priceRes.valid) {
      errors.push({
        row: rowNumber,
        field: "price",
        value: rawPrice || "",
        message: "Invalid numeric value",
      });
      hasRowError = true;
    }

    // Validate & Normalize Stock Qty
    const rawStock = rowData["stockQty"];
    const stockRes = parseNumber(rawStock);
    if (!stockRes.valid) {
      errors.push({
        row: rowNumber,
        field: "stockQty",
        value: rawStock || "",
        message: "Invalid numeric value",
      });
      hasRowError = true;
    }

    // Parse Attributes & collect any malformed warnings
    const rawAttributes = rowData["attributes"];
    const attrRes = parseAttributes(rawAttributes);
    if (attrRes.errors.length > 0) {
      attrRes.errors.forEach((attrErrMsg) => {
        errors.push({
          row: rowNumber,
          field: "attributes",
          value: rawAttributes || "",
          message: attrErrMsg,
        });
      });
    }

    if (hasRowError) {
      failedRows++;
      return;
    }

    // Optional fields
    const description = normalizeText(rowData["description"]);
    const category = normalizeText(rowData["category"]);
    const unit = normalizeUnit(rowData["unit"]);
    const sku = normalizeText(rowData["sku"]) || null;
    const brand = normalizeText(rowData["brand"]) || null;

    products.push({
      name,
      description,
      category,
      unit,
      price: priceRes.val,
      stockQty: stockRes.val,
      attributes: attrRes.attributes,
      productSource: "csv",
      sku,
      brand,
    });

    successfulRows++;
  });

  return {
    products,
    errors,
    totalRows,
    successfulRows,
    failedRows,
  };
}

/**
 * Main public entry point for parsing CSV product data in Bazaar.
 * Accepts string, File, Blob, or Buffer inputs.
 */
export async function parseCsvProducts(
  csvInput: string | File | Blob | Buffer
): Promise<ParseCsvResult> {
  const csvText = await csvInputToString(csvInput);
  return parseCsvProductsSync(csvText);
}
