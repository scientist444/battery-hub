// Documents stored in Cosmos DB. Money is whole rupees, weights are grams.

export interface Category {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  sort: number;
  active: boolean;
}

export interface ProductSupplier {
  supplierId: string;
  supplierSku?: string;
  costPkr?: number;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  /** Partition key. */
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  specs: string[];
  safetyNote: string;
  images: string[];
  pricePkr: number;
  /** Units on hand; null means stock is not tracked. */
  stock: number | null;
  weightG?: number;
  boxCm?: { l: number; w: number; h: number };
  containsLithium: boolean;
  suppliers: ProductSupplier[];
  featured: boolean;
  active: boolean;
  updatedAt: string;
}

export interface SupplierLocation {
  address: string;
  cityId: string;
  cityName: string;
  /** Pickup address ID in the courier's system (Trax). */
  traxPickupAddressId?: number;
  pickupHours?: string;
  isDefault: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  locations: SupplierLocation[];
  active: boolean;
  updatedAt: string;
}

export interface City {
  id: string;
  name: string;
  province: string;
  /** City ID in Trax's system, when known. */
  traxCityId?: number;
}

export type Transport = 'road' | 'air' | 'unknown';

export interface CourierService {
  code: string;
  name: string;
  transport: Transport;
  enabled: boolean;
  /** Lower is faster. */
  speedRank: number;
  maxWeightG?: number;
  /** Courier's own ID for this service (Trax shipping_mode_id). */
  courierId?: number;
  etaDays?: string;
}

export interface WeightRule {
  maxWeightG: number;
  preferredService: string;
}

export interface FlatRateTable {
  sameCity: number;
  sameProvince: number;
  otherProvince: number;
  /** Charged for each kg (or part) above the first. */
  perExtraKg: number;
}

export interface StoreSettings {
  id: 'store';
  /** Supplier used for products that have none assigned. */
  defaultSupplierId?: string;
  courierMode: 'flat' | 'trax';
  /** Book with the courier automatically once an order is confirmed. */
  autoBook: boolean;
  services: CourierService[];
  weightRules: WeightRule[];
  /** If a faster allowed service costs at most this much more than the cheapest, prefer it. */
  tieBreakPkr: number;
  /** Exclude services that travel by air for every parcel (Pakistan-to-Pakistan by road). */
  groundOnly: boolean;
  allowCustomerServiceChoice: boolean;
  flatRates: FlatRateTable;
  packagingG: number;
  defaultWeightG: number;
  holdAbovePkr: number;
  maxCodPkr: number;
  rateCacheHours: number;
  updatedAt: string;
}

export type OrderStatus =
  | 'on_hold'
  | 'confirmed'
  | 'booked'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returning'
  | 'returned';

export interface OrderItem {
  productId: string;
  categoryId: string;
  name: string;
  unitPricePkr: number;
  qty: number;
  supplierId: string;
}

export interface ShipmentEvent {
  status: string;
  message: string;
  location?: string;
  at: string;
}

export interface Shipment {
  supplierId: string;
  pickup: SupplierLocation;
  itemIndexes: number[];
  courier: 'trax' | 'manual';
  serviceCode: string;
  weightG: number;
  codAmountPkr: number;
  quotedFeePkr: number;
  billedFeePkr?: number;
  trackingNumber?: string;
  courierStatus?: string;
  status: OrderStatus;
  bookedAt?: string;
  deliveredAt?: string;
  lastError?: string;
  events: ShipmentEvent[];
}

export interface OrderCustomer {
  name: string;
  phone: string;
  email?: string;
  cityId: string;
  cityName: string;
  province: string;
  address: string;
  landmark?: string;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  holdReason?: string;
  customer: OrderCustomer;
  items: OrderItem[];
  shipments: Shipment[];
  paymentMethod: 'cod' | 'sadapay';
  paymentStatus: 'pending' | 'paid' | 'remitted';
  subtotalPkr: number;
  deliveryFeePkr: number;
  totalPkr: number;
  notes?: string;
  history: { status: OrderStatus; note?: string; by: string; at: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  /** Partition key. */
  phone: string;
  name: string;
  email?: string;
  orderCount: number;
  refusedCount: number;
  lastOrderAt: string;
}

export interface CachedRate {
  id: string;
  cityId: string;
  originCityId: string;
  weightBandG: number;
  serviceCode: string;
  feePkr: number;
  fetchedAt: string;
}
