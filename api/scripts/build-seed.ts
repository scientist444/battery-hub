/*
 * Builds the first import for the API from the storefront's generated catalog
 * (src/data/products.ts, made from BatteryHub,pk.xlsx) plus optional extras per product
 * (weight, box size, lithium, supplier, cost price).
 *
 *   node dist/scripts/build-seed.js [extras.json] > seed.json
 *
 * Then POST seed.json to /api/manage/import with the admin API key.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

interface SourceProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  images: string[];
  price: string;
  specs: string[];
  description: string;
  safetyNote: string;
  featured?: boolean;
  stockStatus: string;
}

interface Extras {
  weightG?: number;
  boxCm?: { l: number; w: number; h: number };
  containsLithium?: boolean;
  supplierId?: string;
  costPkr?: number;
}

const CATEGORIES = [
  { id: 'batteries', name: 'Batteries', description: 'Rechargeable battery options for electronics and project use.', sort: 1, active: true },
  { id: 'chargers', name: 'Chargers', description: 'Compatible charging solutions for batteries and small devices.', sort: 2, active: true },
  { id: 'power-supplies', name: 'Power Supplies', description: 'Stable DC power supplies for electronics, testing, and projects.', sort: 3, active: true },
  { id: 'adapters', name: 'Adapters', description: 'AC/DC adapters for routers, LEDs, modules, and low-power devices.', sort: 4, active: true },
  {
    id: 'bms-boards',
    name: 'BMS Boards',
    description: 'Protection boards for compatible lithium battery pack builds. Confirm cell count, chemistry, and current rating before use.',
    sort: 5,
    active: true,
  },
];

export function readCatalog(path: string): SourceProduct[] {
  const source = readFileSync(path, 'utf8');
  const start = source.indexOf('= [') + 2;
  const end = source.indexOf('\n];') + 2;
  return JSON.parse(source.slice(start, end));
}

export function toApiProduct(p: SourceProduct, extras: Extras = {}) {
  const pricePkr = parseInt(p.price.replace(/[^0-9]/g, ''), 10);
  return {
    id: p.id,
    categoryId: p.category,
    slug: p.slug,
    name: p.name,
    description: p.description,
    specs: p.specs,
    safetyNote: p.safetyNote,
    images: p.images,
    pricePkr,
    // Stock counts were never set in the spreadsheet; null means "not tracked" until the admin sets them.
    stock: /out of stock|sold out/i.test(p.stockStatus) ? 0 : null,
    weightG: extras.weightG,
    boxCm: extras.boxCm,
    containsLithium: extras.containsLithium ?? p.category === 'batteries',
    suppliers: extras.supplierId ? [{ supplierId: extras.supplierId, costPkr: extras.costPkr, isPrimary: true }] : [],
    featured: Boolean(p.featured),
    active: true,
  };
}

if (require.main === module) {
  const catalogPath = join(__dirname, '..', '..', '..', 'src', 'data', 'products.ts');
  const extras: Record<string, Extras> = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : {};
  const products = readCatalog(catalogPath).map((p) => toApiProduct(p, extras[p.id]));
  process.stdout.write(JSON.stringify({ categories: CATEGORIES, products }, null, 2));
}
