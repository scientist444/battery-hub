import { CITIES } from './cities';
import { getProducts, getSuppliers } from './catalog';
import { readDoc } from './cosmos';
import { QuoteContext } from './quote';
import { cachedTraxRate } from './rates';
import { getSettings } from './settings';
import { City } from './types';

/** Cities with Trax IDs once synced from Trax (stored in settings/cities), else the built-in list. */
export async function getCities(): Promise<City[]> {
  const stored = await readDoc<{ id: string; cities: City[] }>('settings', 'cities');
  return stored?.doc.cities?.length ? stored.doc.cities : CITIES;
}

export async function quoteContext(): Promise<QuoteContext> {
  const [settings, products, suppliers, cities] = await Promise.all([getSettings(), getProducts(), getSuppliers(), getCities()]);
  return { settings, products, suppliers, cities, rate: cachedTraxRate(settings.rateCacheHours) };
}
