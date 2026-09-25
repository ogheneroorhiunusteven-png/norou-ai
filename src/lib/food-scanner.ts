import { Capacitor } from "@capacitor/core";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";

/**
 * Food scanner: scans a product barcode with the device camera, then looks
 * up nutrition facts from Open Food Facts — a free, open, no-API-key-needed
 * database (openfoodfacts.org). Community-maintained, so coverage is good
 * for branded/packaged foods but not exhaustive — always let the person
 * adjust values before logging, never treat this as authoritative.
 */

export async function isScannerSupported(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await BarcodeScanner.isSupported();
    return res.supported;
  } catch {
    return false;
  }
}

export async function ensureScannerPermission(): Promise<boolean> {
  try {
    const status = await BarcodeScanner.checkPermissions();
    if (status.camera === "granted") return true;
    const req = await BarcodeScanner.requestPermissions();
    return req.camera === "granted";
  } catch {
    return false;
  }
}

/** Opens the native full-screen scan UI and resolves with the first barcode found, or null if cancelled. */
export async function scanBarcode(): Promise<string | null> {
  // Android needs Google Play Services' barcode module installed once.
  if (Capacitor.getPlatform() === "android") {
    try {
      const avail = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!avail.available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
      }
    } catch {
      /* fall through — scan() will surface a clearer error if it truly can't run */
    }
  }

  const result = await BarcodeScanner.scan({
    formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE], // formats real food packaging uses
  });
  return result.barcodes[0]?.rawValue ?? null;
}

export interface ScannedFood {
  name: string;
  calories: number; // per 100g, from Open Food Facts
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
}

/** Looks up a barcode against Open Food Facts. Returns null if not found or offline. */
export async function lookupBarcode(barcode: string): Promise<ScannedFood | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const n = p.nutriments ?? {};
    return {
      name: p.product_name || p.generic_name || "Unknown product",
      calories: Math.round(n["energy-kcal_100g"] ?? 0),
      protein: Math.round(n["proteins_100g"] ?? 0),
      carbs: Math.round(n["carbohydrates_100g"] ?? 0),
      fat: Math.round(n["fat_100g"] ?? 0),
      servingSize: p.serving_size || undefined,
    };
  } catch {
    return null; // offline or API hiccup — caller should fall back to manual entry
  }
}
