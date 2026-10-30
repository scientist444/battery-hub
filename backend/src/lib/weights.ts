/**
 * Estimated weight of one unit with its own box or bag, in grams, for products that have no weight set yet.
 * Taken from typical listings for the same type and rating (e.g. a 60W IP67 driver weighs about 475 g).
 * A weight set on the product always wins. Parcel packaging (settings.packagingG) is added on top.
 */
export const ESTIMATED_WEIGHTS_G: Record<string, number> = {
  // Power supplies and adapters
  'PS-12V-33A-400W': 900,
  'PS-WP-12V-16.6A': 1100,
  'PS-SLIM-12V-25A': 650,
  'PS-RP-12V-12.5A': 600,
  'PS-RP-12V-10A': 500,
  'PS-WP-12V-5A': 500,
  'PS-RP-12V-8.3A': 400,
  'PS-SLIM-12V-2A': 150,
  'AD-15V-3A-1530': 300,
  'AD-12V-2A-1220': 150,
  // Ni-Cd packs
  'BT-NICD-GP-3300': 190,
  'BT-NICD-REEON-3.6V': 120,
  'BT-NICD-4-5A-3.6V-2000': 120,
  'BT-NICD-GFL-2500': 120,
  'BT-NICD-REEON-2.4V': 80,
  'BT-NICD-AA-2.4V': 60,
  // Lithium cells
  'BT-LIPO-FLAT-5000': 100,
  'BT-LI-21700-4000': 80,
  'BT-LI-18650-2400': 60,
  'BT-LI-BHW-2600': 60,
  'BT-LI-DEF-3000': 60,
  'BT-LIPO-703062': 40,
  'BT-LIPO-AMARTOWN-1280': 35,
  'BT-LIPO-803040': 30,
  'BT-LIPO-451550': 20,
  'BT-LIPO-402224': 20,
  'BT-LIPO-451919': 20,
  // Boards
  'BMS-3S-20A-01': 30,
  'CHG-TP4056-HW107': 20,
  'CHG-1S-TACT-01': 20,
};

export function productWeightG(product: { id: string; weightG?: number }): number | undefined {
  return product.weightG || ESTIMATED_WEIGHTS_G[product.id];
}
