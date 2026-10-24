import { WHATSAPP_DISPLAY_NUMBER } from '@/config/store';

/**
 * Store policies shown at /policies/<slug>. Plain sections so the owner can edit the wording here.
 * Business terms (return window, warranty) are the store's defaults; change them here if they change.
 */
export interface Policy {
  slug: string;
  title: string;
  summary: string;
  sections: { heading: string; points: string[] }[];
}

export const POLICIES_UPDATED = '24 October 2026';

const contact = `WhatsApp ${WHATSAPP_DISPLAY_NUMBER}`;

export const POLICIES: Policy[] = [
  {
    slug: 'shipping',
    title: 'Shipping & delivery',
    summary: 'How and when we deliver across Pakistan, and what delivery costs.',
    sections: [
      {
        heading: 'Where we deliver',
        points: [
          'We deliver all over Pakistan by courier (Trax), by road only.',
          'In Rawalpindi and Islamabad you can also choose an instant rider (Bykea / InDrive) at checkout.',
        ],
      },
      {
        heading: 'Delivery time',
        points: [
          'Rawalpindi and Islamabad: usually 1–2 working days by courier, or the same day by instant rider.',
          'Other cities: usually 2–5 working days after dispatch. Remote areas can take longer.',
          'Orders paid in advance are dispatched once the payment is received.',
        ],
      },
      {
        heading: 'Delivery charges',
        points: [
          'The delivery charge depends on your city and the parcel weight, and is shown at checkout before you place the order.',
          'Instant rider: the Bykea / InDrive fare is not included in your total; you pay it to the rider.',
        ],
      },
      {
        heading: 'Cash on delivery and confirmation',
        points: [
          'Cash on delivery is available all over Pakistan. Please keep the exact amount ready.',
          'We may call to confirm large orders before dispatch.',
          'If a cash-on-delivery parcel is refused without reason, we may ask for advance payment on future orders.',
        ],
      },
      {
        heading: 'Tracking',
        points: ['Once your parcel is dispatched you can follow it on the Track your order page with your order number and phone number.'],
      },
    ],
  },
  {
    slug: 'returns',
    title: 'Returns, refunds & warranty',
    summary: 'What to do if an item arrives damaged, wrong or not working.',
    sections: [
      {
        heading: 'Check your parcel',
        points: [
          'Please check your parcel when it arrives. If it is damaged, wrong or missing items, tell us within 48 hours of delivery.',
          `Send your order number with photos (an unboxing video helps) on ${contact}.`,
        ],
      },
      {
        heading: 'Items we replace or refund',
        points: [
          'Items that arrive damaged, wrong, or not working (dead on arrival), reported within 7 days of delivery.',
          'The item must be unused beyond a first test, with its original packaging and accessories.',
          'We send a replacement, or refund you if a replacement is not available.',
        ],
      },
      {
        heading: 'Not covered',
        points: [
          'Damage from wrong wiring, reverse polarity, short circuits, over-charging or over-discharging.',
          'Items that have been soldered, cut, modified, dropped, crushed or exposed to water or heat.',
          'Swollen or leaking batteries caused by use outside their rated limits.',
          'Change-of-mind returns of lithium batteries, for safety reasons.',
        ],
      },
      {
        heading: 'Refunds',
        points: [
          'Approved refunds are sent by JazzCash or bank transfer within 3–5 working days after we receive the item back.',
          'If the mistake was ours, we cover the return delivery. Otherwise delivery charges are not refundable.',
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy policy',
    summary: 'What information we collect, why, and who we share it with.',
    sections: [
      {
        heading: 'What we collect',
        points: [
          'When you order: your name, mobile number, delivery address and, if you give it, your email.',
          'When you sign in with Google: your name and email address. We do not get your Google password.',
          'When you review a product or ask to be notified about stock: what you write and your contact number.',
        ],
      },
      {
        heading: 'How we use it',
        points: [
          'To process, deliver and support your orders, and to contact you about them on call or WhatsApp.',
          'To show your order history and saved details in your account.',
          'We do not sell your information or send marketing messages without asking.',
        ],
      },
      {
        heading: 'Who we share it with',
        points: [
          'The courier (Trax) or rider (Bykea / InDrive) delivering your order receives your name, phone number and address.',
          'Our service providers that host the website and its data (Vercel, Microsoft Azure) store it on our behalf.',
        ],
      },
      {
        heading: 'Payments',
        points: ['We do not take card payments on the website. JazzCash and bank transfers happen in your own app; we only record whether the payment was received.'],
      },
      {
        heading: 'Cookies',
        points: [
          'We use a small number of cookies and browser storage for your cart, your sign-in and our own admin login.',
          'We use privacy-friendly visit statistics (Vercel Analytics) without advertising cookies.',
        ],
      },
      {
        heading: 'Your choices',
        points: [`To see, correct or delete your information, message us on ${contact}.`],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms & conditions',
    summary: 'The terms for buying from Battery HUB.',
    sections: [
      {
        heading: 'Orders and prices',
        points: [
          'Prices are in Pakistani Rupees and can change without notice. The price you see at checkout is the price you pay.',
          'An order is confirmed once we accept it. We may cancel an order if an item is out of stock or was listed at a wrong price, and will refund anything you have paid.',
        ],
      },
      {
        heading: 'Using batteries safely',
        points: [
          'Batteries, chargers and power supplies must be used within their rated voltage, current and temperature limits.',
          'Choosing a product that suits your project is your responsibility; ask us on WhatsApp if you are unsure.',
          'Battery HUB is not responsible for damage or injury caused by misuse, wrong wiring or unsafe charging.',
        ],
      },
      {
        heading: 'Reviews',
        points: ['Reviews must be honest and about the product. We may decline reviews that are offensive, off-topic or contain personal details.'],
      },
      {
        heading: 'Law',
        points: ['These terms follow the laws of Pakistan.'],
      },
    ],
  },
];

export const getPolicy = (slug: string) => POLICIES.find((p) => p.slug === slug);
