import { container, readDoc } from './cosmos';
import { RateLookup } from './quote';
import { trax } from './shipping/courier-registry';
import { CachedRate } from './types';

/** Trax rate with a Cosmos DB cache per route, weight band and service, so checkout rarely waits on Trax. */
export function cachedTraxRate(cacheHours: number): RateLookup {
  return async (origin, destination, weightBandG, codAmountPkr, service) => {
    // v2: rates now include GST; older cached entries are ignored.
    const id = `v2:${origin.id}:${destination.id}:${weightBandG}:${service.code}`;
    const hit = await readDoc<CachedRate>('deliveryRates', id, destination.id);
    if (hit && Date.now() - Date.parse(hit.doc.fetchedAt) < cacheHours * 3600 * 1000) return hit.doc.feePkr;

    const feePkr = await trax.getRate({ origin, destination, weightG: weightBandG, codAmountPkr, service });
    const doc: CachedRate = {
      id,
      cityId: destination.id,
      originCityId: origin.id,
      weightBandG,
      serviceCode: service.code,
      feePkr,
      fetchedAt: new Date().toISOString(),
    };
    await container('deliveryRates').items.upsert(doc);
    return feePkr;
  };
}
