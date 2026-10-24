import { City } from './types';

/**
 * Cities offered at checkout while the courier runs on the flat fee table.
 * When Trax is switched on, `traxCityId` is filled from Trax's city list (admin: sync cities).
 */
export const CITIES: City[] = [
  { id: 'islamabad', name: 'Islamabad', province: 'ICT' },
  { id: 'rawalpindi', name: 'Rawalpindi', province: 'Punjab' },
  { id: 'lahore', name: 'Lahore', province: 'Punjab' },
  { id: 'faisalabad', name: 'Faisalabad', province: 'Punjab' },
  { id: 'multan', name: 'Multan', province: 'Punjab' },
  { id: 'gujranwala', name: 'Gujranwala', province: 'Punjab' },
  { id: 'sialkot', name: 'Sialkot', province: 'Punjab' },
  { id: 'sargodha', name: 'Sargodha', province: 'Punjab' },
  { id: 'bahawalpur', name: 'Bahawalpur', province: 'Punjab' },
  { id: 'sahiwal', name: 'Sahiwal', province: 'Punjab' },
  { id: 'gujrat', name: 'Gujrat', province: 'Punjab' },
  { id: 'jhelum', name: 'Jhelum', province: 'Punjab' },
  { id: 'chakwal', name: 'Chakwal', province: 'Punjab' },
  { id: 'attock', name: 'Attock', province: 'Punjab' },
  { id: 'wah-cantt', name: 'Wah Cantt', province: 'Punjab' },
  { id: 'taxila', name: 'Taxila', province: 'Punjab' },
  { id: 'sheikhupura', name: 'Sheikhupura', province: 'Punjab' },
  { id: 'kasur', name: 'Kasur', province: 'Punjab' },
  { id: 'okara', name: 'Okara', province: 'Punjab' },
  { id: 'rahim-yar-khan', name: 'Rahim Yar Khan', province: 'Punjab' },
  { id: 'dera-ghazi-khan', name: 'Dera Ghazi Khan', province: 'Punjab' },
  { id: 'mianwali', name: 'Mianwali', province: 'Punjab' },
  { id: 'karachi', name: 'Karachi', province: 'Sindh' },
  { id: 'hyderabad', name: 'Hyderabad', province: 'Sindh' },
  { id: 'sukkur', name: 'Sukkur', province: 'Sindh' },
  { id: 'larkana', name: 'Larkana', province: 'Sindh' },
  { id: 'nawabshah', name: 'Nawabshah', province: 'Sindh' },
  { id: 'mirpur-khas', name: 'Mirpur Khas', province: 'Sindh' },
  { id: 'peshawar', name: 'Peshawar', province: 'Khyber Pakhtunkhwa' },
  { id: 'mardan', name: 'Mardan', province: 'Khyber Pakhtunkhwa' },
  { id: 'abbottabad', name: 'Abbottabad', province: 'Khyber Pakhtunkhwa' },
  { id: 'mansehra', name: 'Mansehra', province: 'Khyber Pakhtunkhwa' },
  { id: 'swat', name: 'Swat (Mingora)', province: 'Khyber Pakhtunkhwa' },
  { id: 'nowshera', name: 'Nowshera', province: 'Khyber Pakhtunkhwa' },
  { id: 'kohat', name: 'Kohat', province: 'Khyber Pakhtunkhwa' },
  { id: 'dera-ismail-khan', name: 'Dera Ismail Khan', province: 'Khyber Pakhtunkhwa' },
  { id: 'haripur', name: 'Haripur', province: 'Khyber Pakhtunkhwa' },
  { id: 'quetta', name: 'Quetta', province: 'Balochistan' },
  { id: 'gwadar', name: 'Gwadar', province: 'Balochistan' },
  { id: 'turbat', name: 'Turbat', province: 'Balochistan' },
  { id: 'muzaffarabad', name: 'Muzaffarabad', province: 'Azad Kashmir' },
  { id: 'mirpur-ajk', name: 'Mirpur (AJK)', province: 'Azad Kashmir' },
  { id: 'gilgit', name: 'Gilgit', province: 'Gilgit-Baltistan' },
  { id: 'skardu', name: 'Skardu', province: 'Gilgit-Baltistan' },
];

/** Islamabad and Rawalpindi are one delivery zone. */
const TWIN_CITIES = new Set(['islamabad', 'rawalpindi']);

export function findCity(id: string, cities: City[] = CITIES) {
  return cities.find((city) => city.id === id);
}

export function isSameZone(a: string, b: string) {
  return a === b || (TWIN_CITIES.has(a) && TWIN_CITIES.has(b));
}
