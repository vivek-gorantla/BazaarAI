export type MockItem = { name: string; qty: number; unit: string; price: number };

// TODO: Replace mock implementation with real STT/LLM service.
export async function mockTranscribeAudio(): Promise<string> {
  return "Aashirvaad Atta 20 kg at 250 rupees and Maggi 10 packets at 14 rupees";
}

export function mockExtractProducts(transcript: string): { items: MockItem[]; confidence: number } {
  return { items: transcript ? [{ name: "Aashirvaad Atta", qty: 20, unit: "kg", price: 250 }, { name: "Maggi", qty: 10, unit: "pack", price: 14 }] : [], confidence: 0.95 };
}

// TODO: Replace mock implementation with real vision service.
export async function mockExtractProductsFromImage(): Promise<{ items: Array<Record<string, unknown>>; confidence: number }> {
  return { items: [{ name: "Samsung 25W USB-C Charger", category: "electronics", unit: "piece", price: 899, stockQty: 10, attributes: { brand: "Samsung", wattage: "25W", connector: "USB-C" } }], confidence: 0.92 };
}
