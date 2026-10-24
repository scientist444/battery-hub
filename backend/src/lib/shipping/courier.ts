import { City, CourierService, Order, OrderStatus, Shipment, ShipmentEvent } from '../types';

export interface RateRequest {
  origin: City;
  destination: City;
  weightG: number;
  codAmountPkr: number;
  service: CourierService;
}

export interface BookingRequest {
  order: Order;
  shipment: Shipment;
  origin: City;
  destination: City;
  service: CourierService;
  itemDescription: string;
  itemCount: number;
}

export interface BookingResult {
  trackingNumber: string;
  feePkr?: number;
}

export interface TrackingResult {
  status: OrderStatus | null;
  courierStatus: string;
  events: ShipmentEvent[];
}

/** Everything the store needs from a courier. Trax is the first; others plug in here. */
export interface Courier {
  name: 'trax';
  getRate(request: RateRequest): Promise<number>;
  book(request: BookingRequest): Promise<BookingResult>;
  track(trackingNumber: string): Promise<TrackingResult>;
  label(trackingNumber: string): Promise<Buffer>;
  cancel(trackingNumber: string): Promise<void>;
}
