import { findCity } from './cities';
import { HttpError } from './http';
import { primarySupplierId } from './catalog';
import { flatRate } from './shipping/flat';
import { ServiceOption, allowedServices, chooseService, weightBand } from './shipping/select';
import { City, CourierService, Product, StoreSettings, Supplier, SupplierLocation } from './types';

export interface CartLine {
  productId: string;
  qty: number;
}

export interface QuotedShipment {
  supplierId: string;
  pickup: SupplierLocation;
  origin: City;
  itemIndexes: number[];
  weightG: number;
  /** True when a product had no weight and the default was used. */
  weightEstimated: boolean;
  containsLithium: boolean;
  subtotalPkr: number;
  options: ServiceOption[];
  chosen: ServiceOption;
  /** True when Trax did not answer and the flat table was used. */
  feeEstimated: boolean;
}

export interface Quote {
  city: City;
  lines: { product: Product; qty: number; supplierId: string }[];
  shipments: QuotedShipment[];
  subtotalPkr: number;
  deliveryFeePkr: number;
  totalPkr: number;
}

export type RateLookup = (origin: City, destination: City, weightBandG: number, codAmountPkr: number, service: CourierService) => Promise<number>;

export interface QuoteContext {
  settings: StoreSettings;
  products: Product[];
  suppliers: Supplier[];
  cities: City[];
  /** Live or cached courier rate; throws when unavailable. Only used in 'trax' mode. */
  rate: RateLookup;
}

const STANDARD: Pick<ServiceOption, 'code' | 'name'> = { code: 'standard', name: 'Standard delivery' };

/** Price a cart for a destination city. Every amount is computed here, never taken from the browser. */
export async function buildQuote(lines: CartLine[], cityId: string, preferredService: string | undefined, ctx: QuoteContext): Promise<Quote> {
  const { settings } = ctx;
  const city = findCity(cityId, ctx.cities);
  if (!city) throw new HttpError(400, 'We do not deliver to this city yet. Please choose another city or contact us on WhatsApp.');
  if (lines.length === 0) throw new HttpError(400, 'Your cart is empty.');

  const resolved = lines.map((line) => {
    const product = ctx.products.find((p) => p.id === line.productId);
    if (!product || !product.active) throw new HttpError(409, 'A product in your cart is no longer available.', { productId: line.productId });
    if (product.stock !== null && product.stock < line.qty) {
      throw new HttpError(409, `Only ${Math.max(product.stock, 0)} of ${product.name} left in stock.`, { productId: product.id, available: product.stock });
    }
    const supplierId = primarySupplierId(product, settings.defaultSupplierId);
    if (!supplierId) throw new HttpError(500, `No supplier is set for ${product.name}.`);
    return { product, qty: line.qty, supplierId };
  });

  // One shipment per supplier, picked up from that supplier's default location.
  const groups = new Map<string, number[]>();
  resolved.forEach((line, index) => groups.set(line.supplierId, [...(groups.get(line.supplierId) ?? []), index]));

  const shipments: QuotedShipment[] = [];
  for (const [supplierId, itemIndexes] of groups) {
    const supplier = ctx.suppliers.find((s) => s.id === supplierId && s.active);
    const pickup = supplier?.locations.find((l) => l.isDefault) ?? supplier?.locations[0];
    const origin = pickup && findCity(pickup.cityId, ctx.cities);
    if (!supplier || !pickup || !origin) throw new HttpError(500, `Supplier ${supplierId} has no active pickup address.`);

    const groupLines = itemIndexes.map((i) => resolved[i]);
    const weightEstimated = groupLines.some((l) => !l.product.weightG);
    const weightG = settings.packagingG + groupLines.reduce((sum, l) => sum + (l.product.weightG ?? settings.defaultWeightG) * l.qty, 0);
    const containsLithium = groupLines.some((l) => l.product.containsLithium);
    const subtotalPkr = groupLines.reduce((sum, l) => sum + l.product.pricePkr * l.qty, 0);
    const flatFee = flatRate(settings.flatRates, origin, city, weightG);

    let options: ServiceOption[];
    let feeEstimated = false;
    if (settings.courierMode === 'flat') {
      options = [{ ...STANDARD, feePkr: flatFee }];
    } else {
      const services = allowedServices(settings, weightG, containsLithium);
      if (services.length === 0) throw new HttpError(409, 'No delivery service can carry this order. Please contact us on WhatsApp.');
      const priced = await Promise.all(
        services.map(async (service): Promise<ServiceOption | undefined> => {
          try {
            const feePkr = await ctx.rate(origin, city, weightBand(weightG), subtotalPkr, service);
            return { code: service.code, name: service.name, etaDays: service.etaDays, feePkr };
          } catch {
            return undefined;
          }
        }),
      );
      options = priced.filter((o): o is ServiceOption => Boolean(o));
      if (options.length === 0) {
        feeEstimated = true;
        options = services.map((s) => ({ code: s.code, name: s.name, etaDays: s.etaDays, feePkr: flatFee }));
      }
    }

    const requested = settings.allowCustomerServiceChoice && preferredService ? options.find((o) => o.code === preferredService) : undefined;
    const chosen = requested ?? chooseService(settings, weightG, options)!;
    shipments.push({ supplierId, pickup, origin, itemIndexes, weightG, weightEstimated, containsLithium, subtotalPkr, options, chosen, feeEstimated });
  }

  const subtotalPkr = shipments.reduce((sum, s) => sum + s.subtotalPkr, 0);
  const deliveryFeePkr = shipments.reduce((sum, s) => sum + s.chosen.feePkr, 0);
  return { city, lines: resolved, shipments, subtotalPkr, deliveryFeePkr, totalPkr: subtotalPkr + deliveryFeePkr };
}

/** The response sent to the storefront. */
export function publicQuote(quote: Quote) {
  return {
    city: { id: quote.city.id, name: quote.city.name },
    items: quote.lines.map((l) => ({ productId: l.product.id, name: l.product.name, unitPricePkr: l.product.pricePkr, qty: l.qty })),
    shipments: quote.shipments.map((s) => ({
      itemIndexes: s.itemIndexes,
      weightG: s.weightG,
      options: s.options,
      chosen: s.chosen,
    })),
    subtotalPkr: quote.subtotalPkr,
    deliveryFeePkr: quote.deliveryFeePkr,
    totalPkr: quote.totalPkr,
    paymentMethods: ['cod'],
  };
}
