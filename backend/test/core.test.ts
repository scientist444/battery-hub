import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CITIES, findCity } from '../src/lib/cities';
import { holdReason, rollUpStatus } from '../src/lib/orders';
import { buildQuote, QuoteContext } from '../src/lib/quote';
import { DEFAULT_SETTINGS } from '../src/lib/settings';
import { flatRate } from '../src/lib/shipping/flat';
import { allowedServices, chooseService, weightBand } from '../src/lib/shipping/select';
import { mapTraxStatus } from '../src/lib/shipping/trax';
import { Order, Product, StoreSettings, Supplier } from '../src/lib/types';
import { pkMobile } from '../src/lib/validation';

const city = (id: string) => findCity(id)!;

function product(overrides: Partial<Product>): Product {
  return {
    id: 'P1',
    categoryId: 'chargers',
    slug: 'p1',
    name: 'TP4056 Module',
    description: '',
    specs: [],
    safetyNote: '',
    images: [],
    pricePkr: 250,
    stock: null,
    weightG: 100,
    containsLithium: false,
    suppliers: [{ supplierId: 'pindi', isPrimary: true }],
    featured: false,
    active: true,
    updatedAt: '',
    ...overrides,
  };
}

const supplier = (id: string, cityId: string): Supplier => ({
  id,
  name: id,
  phone: '03001234567',
  locations: [{ address: 'Saddar', cityId, cityName: cityId, isDefault: true }],
  active: true,
  updatedAt: '',
});

function ctx(settings: Partial<StoreSettings>, products: Product[], rate: QuoteContext['rate'] = async () => 999): QuoteContext {
  return {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    products,
    suppliers: [supplier('pindi', 'rawalpindi'), supplier('lahore-co', 'lahore')],
    cities: CITIES,
    rate,
  };
}

test('flat rate: same zone, same province, other province, extra kg', () => {
  const t = DEFAULT_SETTINGS.flatRates;
  assert.equal(flatRate(t, city('rawalpindi'), city('islamabad'), 800), t.sameCity);
  assert.equal(flatRate(t, city('rawalpindi'), city('lahore'), 800), t.sameProvince);
  assert.equal(flatRate(t, city('islamabad'), city('lahore'), 800), t.sameProvince);
  assert.equal(flatRate(t, city('rawalpindi'), city('karachi'), 800), t.otherProvince);
  assert.equal(flatRate(t, city('rawalpindi'), city('karachi'), 2500), t.otherProvince + 2 * t.perExtraKg);
});

test('weight bands', () => {
  assert.equal(weightBand(120), 500);
  assert.equal(weightBand(501), 1000);
  assert.equal(weightBand(2001), 3000);
});

test('air services are excluded when ground-only or for lithium', () => {
  const services = DEFAULT_SETTINGS.services.map((s) => (s.code === 'rush' ? { ...s, transport: 'air' as const } : s));
  const groundOnly = { ...DEFAULT_SETTINGS, services, groundOnly: true };
  assert.ok(!allowedServices(groundOnly, 500, false).some((s) => s.code === 'rush'));
  const anyTransport = { ...groundOnly, groundOnly: false };
  assert.ok(allowedServices(anyTransport, 500, false).some((s) => s.code === 'rush'));
  assert.ok(!allowedServices(anyTransport, 500, true).some((s) => s.code === 'rush'));
});

test('service choice: weight rule first, then cheapest with speed tie-break', () => {
  const options = [
    { code: 'rush', name: 'Rush', feePkr: 300 },
    { code: 'swift', name: 'Swift', feePkr: 250 },
    { code: 'saver_plus', name: 'Saver Plus', feePkr: 230 },
  ];
  assert.equal(chooseService(DEFAULT_SETTINGS, 800, options)?.code, 'rush');
  assert.equal(chooseService(DEFAULT_SETTINGS, 3000, options)?.code, 'swift');
  const noRules = { ...DEFAULT_SETTINGS, weightRules: [] };
  // Swift is within Rs. 30 of the cheapest and faster.
  assert.equal(chooseService(noRules, 3000, options)?.code, 'swift');
  assert.equal(chooseService({ ...noRules, tieBreakPkr: 0 }, 3000, options)?.code, 'saver_plus');
});

test('quote in flat mode: total = products + delivery, packaging added to weight', async () => {
  const q = await buildQuote([{ productId: 'P1', qty: 2 }], 'karachi', undefined, ctx({ courierMode: 'flat' }, [product({})]));
  assert.equal(q.subtotalPkr, 500);
  assert.equal(q.shipments.length, 1);
  assert.equal(q.shipments[0].weightG, 2 * 100 + DEFAULT_SETTINGS.packagingG);
  assert.equal(q.deliveryFeePkr, DEFAULT_SETTINGS.flatRates.otherProvince);
  assert.equal(q.totalPkr, 500 + DEFAULT_SETTINGS.flatRates.otherProvince);
});

test('quote splits shipments by supplier and sums delivery', async () => {
  const products = [product({}), product({ id: 'P2', suppliers: [{ supplierId: 'lahore-co', isPrimary: true }] })];
  const q = await buildQuote(
    [
      { productId: 'P1', qty: 1 },
      { productId: 'P2', qty: 1 },
    ],
    'lahore',
    undefined,
    ctx({ courierMode: 'flat' }, products),
  );
  assert.equal(q.shipments.length, 2);
  const t = DEFAULT_SETTINGS.flatRates;
  assert.equal(q.deliveryFeePkr, t.sameProvince + t.sameCity);
});

test('quote in trax mode uses live rates and falls back to the flat table when Trax fails', async () => {
  const rates: Record<string, number> = { rush: 320, swift: 280, saver_plus: 260 };
  const live = await buildQuote([{ productId: 'P1', qty: 1 }], 'karachi', undefined, ctx({ courierMode: 'trax' }, [product({})], async (_o, _d, _w, _c, s) => rates[s.code]));
  // Cheapest is Saver Plus (260), but Swift is within the Rs. 30 tie-break and ranked faster.
  assert.equal(live.shipments[0].chosen.code, 'swift');
  assert.equal(live.deliveryFeePkr, 280);
  assert.deepEqual(live.shipments[0].options.map((o) => o.code), ['saver_plus', 'swift', 'rush']);
  assert.ok(live.shipments[0].options.every((o) => !o.etaDays));

  // Trax's real prices for this account: Rush is cheapest, even for a 3 kg parcel.
  const real: Record<string, number> = { rush: 315, swift: 458, saver_plus: 573 };
  const heavy = await buildQuote([{ productId: 'P1', qty: 30 }], 'lahore', undefined, ctx({ courierMode: 'trax' }, [product({})], async (_o, _d, _w, _c, s) => real[s.code]));
  assert.equal(heavy.shipments[0].chosen.code, 'rush');
  assert.equal(heavy.deliveryFeePkr, 315);

  const chosenByCustomer = await buildQuote([{ productId: 'P1', qty: 1 }], 'karachi', 'saver_plus', ctx({ courierMode: 'trax' }, [product({})], async (_o, _d, _w, _c, s) => rates[s.code]));
  assert.equal(chosenByCustomer.deliveryFeePkr, 260);

  const down = await buildQuote([{ productId: 'P1', qty: 1 }], 'karachi', undefined, ctx({ courierMode: 'trax' }, [product({})], async () => {
    throw new Error('timeout');
  }));
  assert.equal(down.shipments[0].feeEstimated, true);
  assert.equal(down.deliveryFeePkr, DEFAULT_SETTINGS.flatRates.otherProvince);
});

test('quote in trax mode only offers the services Trax delivers to the city', async () => {
  const base = ctx({ courierMode: 'trax' }, [product({})]);
  const cities = base.cities.map((c) => (c.id === 'karachi' ? { ...c, traxModes: ['Rush', 'Saver Plus'] } : c));
  const quote = await buildQuote([{ productId: 'P1', qty: 1 }], 'karachi', undefined, { ...base, cities });
  assert.deepEqual(quote.shipments[0].options.map((o) => o.code).sort(), ['rush', 'saver_plus']);
});

test('quote refuses unknown cities, missing products and short stock', async () => {
  const c = ctx({}, [product({ stock: 1 })]);
  await assert.rejects(buildQuote([{ productId: 'P1', qty: 1 }], 'atlantis', undefined, c), /do not deliver/);
  await assert.rejects(buildQuote([{ productId: 'NOPE', qty: 1 }], 'lahore', undefined, c), /no longer available/);
  await assert.rejects(buildQuote([{ productId: 'P1', qty: 2 }], 'lahore', undefined, c), /Only 1/);
});

test('hold rules', () => {
  assert.equal(holdReason(1000, { refusedCount: 0 }, DEFAULT_SETTINGS), undefined);
  assert.match(holdReason(20000, { refusedCount: 0 }, DEFAULT_SETTINGS)!, /above/);
  assert.match(holdReason(1000, { refusedCount: 1 }, DEFAULT_SETTINGS)!, /refused/);
});

test('order status rolls up from shipments', () => {
  const order = (statuses: Order['status'][]) => ({ shipments: statuses.map((status) => ({ status })) }) as unknown as Order;
  assert.equal(rollUpStatus(order(['delivered', 'in_transit'])), 'in_transit');
  assert.equal(rollUpStatus(order(['delivered', 'delivered'])), 'delivered');
  assert.equal(rollUpStatus(order(['delivered', 'cancelled'])), 'delivered');
  assert.equal(rollUpStatus(order(['cancelled', 'cancelled'])), 'cancelled');
  assert.equal(rollUpStatus(order(['returning', 'delivered'])), 'returning');
});

test('Trax status text maps to order statuses', () => {
  assert.equal(mapTraxStatus('Shipment - Booked'), 'booked');
  assert.equal(mapTraxStatus('Shipment - Arrived at Origin'), 'in_transit');
  assert.equal(mapTraxStatus('Shipment - Out for Delivery'), 'out_for_delivery');
  assert.equal(mapTraxStatus('Shipment - Delivered'), 'delivered');
  assert.equal(mapTraxStatus('Return - In Transit'), 'returning');
  assert.equal(mapTraxStatus('Return - Delivered to Shipper'), 'returned');
  assert.equal(mapTraxStatus('Something new'), null);
});

test('mobile numbers are normalised', () => {
  assert.equal(pkMobile.parse('0300 1234567'), '03001234567');
  assert.equal(pkMobile.parse('+923001234567'), '03001234567');
  assert.equal(pkMobile.parse('92-300-1234567'), '03001234567');
  assert.equal(pkMobile.safeParse('12345').success, false);
});

test('seed builds valid Cosmos IDs for all storefront products', () => {
  const { readCatalog, toApiProduct } = require('../scripts/build-seed') as typeof import('../scripts/build-seed');
  const products = readCatalog(require('path').join(__dirname, '..', '..', '..', 'src', 'data', 'products.ts')).map((p) => toApiProduct(p));
  assert.equal(products.length, 30);
  for (const p of products) assert.match(p.id, /^[A-Za-z0-9.-]+$/, p.id);
  assert.equal(new Set(products.map((p) => p.id)).size, products.length);
});

test('instant rider: offered only inside Rawalpindi/Islamabad, never the default, fare not charged', async () => {
  const local = await buildQuote([{ productId: 'P1', qty: 1 }], 'islamabad', undefined, ctx({ courierMode: 'flat' }, [product({})]));
  assert.deepEqual(local.shipments[0].options.map((o) => o.code), ['standard', 'instant']);
  assert.equal(local.shipments[0].chosen.code, 'standard');

  const rider = await buildQuote([{ productId: 'P1', qty: 1 }], 'islamabad', 'instant', ctx({ courierMode: 'flat', allowCustomerServiceChoice: false }, [product({})]));
  assert.equal(rider.shipments[0].chosen.code, 'instant');
  assert.equal(rider.deliveryFeePkr, 0);
  assert.equal(rider.totalPkr, 250);

  const far = await buildQuote([{ productId: 'P1', qty: 1 }], 'karachi', 'instant', ctx({ courierMode: 'flat' }, [product({})]));
  assert.equal(far.shipments[0].chosen.code, 'standard');
  assert.ok(!far.shipments[0].options.some((o) => o.code === 'instant'));

  const off = await buildQuote([{ productId: 'P1', qty: 1 }], 'rawalpindi', 'instant', ctx({ courierMode: 'flat', instantDelivery: { enabled: false, cityIds: ['rawalpindi'] } }, [product({})]));
  assert.equal(off.shipments[0].chosen.code, 'standard');
});

test('review summary: average to one decimal and star counts', async () => {
  const { summarize } = await import('../src/lib/reviews');
  assert.deepEqual(summarize([]), { average: 0, count: 0, stars: [0, 0, 0, 0, 0] });
  assert.deepEqual(summarize([{ rating: 5 }, { rating: 4 }, { rating: 4 }]), { average: 4.3, count: 3, stars: [0, 0, 0, 2, 1] });
});

test('every storefront product has a weight estimate, and a set weight wins', async () => {
  const { ESTIMATED_WEIGHTS_G, productWeightG } = await import('../src/lib/weights');
  const { readCatalog, toApiProduct } = require('../scripts/build-seed') as typeof import('../scripts/build-seed');
  const products = readCatalog(require('path').join(__dirname, '..', '..', '..', 'src', 'data', 'products.ts')).map((p) => toApiProduct(p));
  for (const p of products) assert.ok(ESTIMATED_WEIGHTS_G[p.id], `no weight for ${p.id}`);
  assert.equal(Object.keys(ESTIMATED_WEIGHTS_G).length, products.length);
  assert.equal(productWeightG({ id: 'PS-12V-33A-400W' }), 900);
  assert.equal(productWeightG({ id: 'PS-12V-33A-400W', weightG: 1200 }), 1200);
});
