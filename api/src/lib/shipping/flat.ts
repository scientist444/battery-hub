import { isSameZone } from '../cities';
import { City, FlatRateTable } from '../types';

/** Fixed delivery fee used before Trax is connected, and as a fallback when Trax does not answer. */
export function flatRate(table: FlatRateTable, origin: City, destination: City, weightG: number) {
  const base = isSameZone(origin.id, destination.id)
    ? table.sameCity
    : origin.province === destination.province ||
        // Rawalpindi (Punjab) and Islamabad (ICT) pickups count Punjab and ICT as one province.
        (['Punjab', 'ICT'].includes(origin.province) && ['Punjab', 'ICT'].includes(destination.province))
      ? table.sameProvince
      : table.otherProvince;
  const extraKg = Math.max(0, Math.ceil(weightG / 1000) - 1);
  return base + extraKg * table.perExtraKg;
}
