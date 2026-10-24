import { CourierService, StoreSettings } from '../types';

export interface ServiceOption {
  code: string;
  name: string;
  feePkr: number;
  etaDays?: string;
}

/** Services that may carry this parcel: enabled, within weight limits, and never by air when ground-only or lithium. */
export function allowedServices(settings: StoreSettings, weightG: number, containsLithium: boolean): CourierService[] {
  return settings.services
    .filter((service) => service.enabled)
    .filter((service) => !service.maxWeightG || weightG <= service.maxWeightG)
    .filter((service) => !((settings.groundOnly || containsLithium) && service.transport === 'air'))
    .sort((a, b) => a.speedRank - b.speedRank);
}

/**
 * Pick the default service from priced options:
 * 1. the weight band's preferred service, if it is allowed and priced;
 * 2. otherwise the cheapest, unless a faster one costs at most `tieBreakPkr` more.
 */
export function chooseService(settings: StoreSettings, weightG: number, options: ServiceOption[]): ServiceOption | undefined {
  if (options.length === 0) return undefined;
  const rule = [...settings.weightRules].sort((a, b) => a.maxWeightG - b.maxWeightG).find((r) => weightG <= r.maxWeightG);
  const preferred = rule && options.find((option) => option.code === rule.preferredService);
  if (preferred) return preferred;

  const speed = (code: string) => settings.services.find((s) => s.code === code)?.speedRank ?? 99;
  const cheapest = options.reduce((best, option) => (option.feePkr < best.feePkr ? option : best));
  const withinTie = options.filter((option) => option.feePkr - cheapest.feePkr <= settings.tieBreakPkr);
  return withinTie.sort((a, b) => speed(a.code) - speed(b.code))[0];
}

/** Weight bands used for caching rates: 500 g steps up to 2 kg, then whole kilograms. */
export function weightBand(weightG: number) {
  if (weightG <= 2000) return Math.max(500, Math.ceil(weightG / 500) * 500);
  return Math.ceil(weightG / 1000) * 1000;
}
