import { z } from 'zod';

/** Pakistani mobile number in any common format, normalised to 03XXXXXXXXX. */
export const pkMobile = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .transform((value) => value.replace(/^(\+92|0092|92)(?=3\d{9}$)/, '0'))
  .refine((value) => /^03\d{9}$/.test(value), 'Enter a valid mobile number, e.g. 0300 1234567.');

export const accountId = z.string().regex(/^acct_[A-Za-z0-9_-]{6,80}$/);

export const accountSchema = z.object({
  accountId,
  email: z.string().trim().email().max(120),
  name: z.string().trim().min(2).max(80),
  mobile: pkMobile.optional().or(z.literal('').transform(() => undefined)),
  address: z
    .object({
      cityId: z.string().min(1),
      address: z.string().trim().min(10, 'Please enter your full address.').max(300),
      landmark: z.string().trim().max(120).optional(),
    })
    .optional(),
});

export const cartSchema = z
  .array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(50) }))
  .min(1)
  .max(30);

export const quoteSchema = z.object({
  items: cartSchema,
  cityId: z.string().min(1),
  service: z.string().optional(),
});

export const orderSchema = z.object({
  items: cartSchema,
  service: z.string().optional(),
  paymentMethod: z.enum(['cod', 'jazzcash', 'bank']).default('cod'),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: pkMobile,
    email: z.string().trim().email().max(120).optional().or(z.literal('').transform(() => undefined)),
    cityId: z.string().min(1),
    address: z.string().trim().min(10, 'Please enter your full address.').max(300),
    landmark: z.string().trim().max(120).optional(),
  }),
  notes: z.string().trim().max(500).optional(),
  /** Set by the website from its own verified sign-in session, never from the browser. */
  accountId: accountId.optional(),
  /** The total the customer saw. If prices changed since, the order is refused with the new quote. */
  expectedTotalPkr: z.number().int().nonnegative(),
});

const supplierLocation = z.object({
  address: z.string().trim().min(10).max(300),
  cityId: z.string().min(1),
  cityName: z.string().min(1),
  traxPickupAddressId: z.number().int().positive().optional(),
  pickupHours: z.string().max(100).optional(),
  isDefault: z.boolean(),
});

export const supplierSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/, 'Use lowercase letters, numbers and dashes.'),
  name: z.string().trim().min(2).max(100),
  contactName: z.string().trim().max(80).optional(),
  phone: pkMobile.optional(),
  whatsapp: pkMobile.optional(),
  email: z.string().email().optional(),
  locations: z.array(supplierLocation).min(1),
  active: z.boolean().default(true),
});

export const categorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/),
  name: z.string().trim().min(2).max(60),
  description: z.string().max(500).default(''),
  parentId: z.string().optional(),
  sort: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9.-]{2,60}$/, 'Use letters, numbers, dots and dashes.'),
  categoryId: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]{2,80}$/),
  name: z.string().trim().min(2).max(150),
  description: z.string().max(4000).default(''),
  specs: z.array(z.string().max(300)).max(30).default([]),
  safetyNote: z.string().max(500).default(''),
  images: z.array(z.string().url().or(z.string().startsWith('/'))).max(12).default([]),
  pricePkr: z.number().int().positive(),
  stock: z.number().int().min(0).nullable(),
  weightG: z.number().int().positive().max(100000).optional(),
  boxCm: z.object({ l: z.number().positive(), w: z.number().positive(), h: z.number().positive() }).optional(),
  containsLithium: z.boolean().default(false),
  suppliers: z
    .array(z.object({ supplierId: z.string(), supplierSku: z.string().optional(), costPkr: z.number().int().nonnegative().optional(), isPrimary: z.boolean() }))
    .default([]),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const statusChangeSchema = z.object({
  status: z.enum(['on_hold', 'confirmed', 'cancelled', 'delivered', 'returned']),
  note: z.string().max(300).optional(),
});

export const manualTrackingSchema = z.object({
  shipmentIndex: z.number().int().min(0),
  trackingNumber: z.string().trim().min(4).max(40),
});

/** Storefront-owned product fields, pushed by the website admin. Shipping fields (weight, box, suppliers) stay as set in the API. */
export const catalogSyncSchema = z.object({
  products: z
    .array(
      productSchema.pick({
        id: true,
        categoryId: true,
        slug: true,
        name: true,
        description: true,
        specs: true,
        safetyNote: true,
        images: true,
        pricePkr: true,
        stock: true,
        featured: true,
      }),
    )
    .max(2000),
});

export const reviewSchema = z.object({
  accountId,
  productId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(40),
  rating: z.number().int().min(1, 'Choose a star rating.').max(5),
  title: z.string().trim().max(80).optional(),
  body: z.string().trim().min(10, 'Write at least a sentence about the product.').max(1000),
});

export const reviewStatusSchema = z.object({
  productId: z.string().min(1).max(120),
  status: z.enum(['approved', 'hidden']),
});
