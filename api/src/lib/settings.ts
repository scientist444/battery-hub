import { container, readDoc } from './cosmos';
import { StoreSettings } from './types';

/**
 * Defaults until the admin changes them. Trax service IDs and transport are placeholders
 * until Trax confirms them for the BatteryHUB account.
 */
export const DEFAULT_SETTINGS: StoreSettings = {
  id: 'store',
  courierMode: 'flat',
  autoBook: false,
  services: [
    { code: 'rush', name: 'Rush', transport: 'unknown', enabled: true, speedRank: 1, courierId: 1, etaDays: '1-2' },
    { code: 'swift', name: 'Swift', transport: 'unknown', enabled: true, speedRank: 2, courierId: 3, etaDays: '2-3' },
    { code: 'saver_plus', name: 'Saver Plus', transport: 'unknown', enabled: true, speedRank: 3, courierId: 2, etaDays: '3-5' },
  ],
  weightRules: [
    { maxWeightG: 1000, preferredService: 'rush' },
    { maxWeightG: 5000, preferredService: 'swift' },
    { maxWeightG: Number.MAX_SAFE_INTEGER, preferredService: 'saver_plus' },
  ],
  tieBreakPkr: 30,
  groundOnly: true,
  allowCustomerServiceChoice: true,
  flatRates: { sameCity: 200, sameProvince: 250, otherProvince: 300, perExtraKg: 100 },
  packagingG: 150,
  defaultWeightG: 500,
  holdAbovePkr: 15000,
  maxCodPkr: 50000,
  rateCacheHours: 24,
  updatedAt: new Date(0).toISOString(),
};

let cached: { value: StoreSettings; at: number } | undefined;
const CACHE_MS = 60 * 1000;

export async function getSettings(): Promise<StoreSettings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const stored = await readDoc<Partial<StoreSettings>>('settings', 'store');
  const value = { ...DEFAULT_SETTINGS, ...(stored?.doc ?? {}), id: 'store' as const };
  cached = { value, at: Date.now() };
  return value;
}

export async function saveSettings(patch: Partial<StoreSettings>) {
  const current = await getSettings();
  const next: StoreSettings = { ...current, ...patch, id: 'store', updatedAt: new Date().toISOString() };
  await container('settings').items.upsert(next);
  cached = { value: next, at: Date.now() };
  return next;
}
