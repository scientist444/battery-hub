# Battery HUB — Pakistan's Smart Battery Store

A complete, production-ready eCommerce website for Battery HUB built with Next.js 14, React 18, Tailwind CSS, and Framer Motion.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS v3
- **Animations**: Framer Motion v11
- **Icons**: Lucide React
- **State**: React Context API (cart persistence in localStorage)
- **TypeScript**: Full type safety

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero, features, categories, why us, testimonials, newsletter |
| Shop | `/shop` | Full product grid with filters, search, sort |
| Product Detail | `/product/[id]` | Gallery, specs, reviews, add to cart |
| Battery Calculator | `/calculator` | Smart interactive battery recommendation tool |
| Custom Battery | `/custom-battery` | Custom pack request form |
| About | `/about` | Company story, mission, team, values |
| Contact | `/contact` | Contact form, WhatsApp, FAQ accordion |
| Cart | `/cart` | Full cart with coupon code support |
| Checkout | `/checkout` | Multi-step checkout with Pakistani payment methods |
| Blog | `/blog` | Battery guides and educational articles |

## Quick Start

1. **Install dependencies**
   ```bash
   cd battery-hub
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open** [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
npm run build
npm run start
```

## Deployment

### Vercel (Recommended — Free)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` (follow prompts)
3. Or connect your GitHub repo at [vercel.com](https://vercel.com)

**Environment**: No environment variables required for the base setup.

### Netlify

1. Build command: `npm run build`
2. Publish directory: `.next`
3. Install the Next.js Netlify plugin

### Hostinger VPS

1. Build: `npm run build`
2. Upload the `.next` folder, `public`, `package.json`, `next.config.js`
3. Run: `npm install --production && npm start`
4. Use PM2 for process management: `pm2 start npm -- start`

## Customization

### Adding Products
Edit `src/data/products.ts` — each product follows the `Product` interface in `src/types/index.ts`.

### Changing Colors
Edit `tailwind.config.js` — the brand colors are defined in `theme.extend.colors.brand`.

### WhatsApp Number
Search and replace `923001234567` with your actual WhatsApp number (in international format, no spaces or dashes).

### Contact Email
Replace `info@batteryhub.pk` in the footer and contact page with your actual email.

## Features

- Responsive mobile-first design
- Sticky navbar with scroll detection
- Cart persisted in localStorage
- Smart battery calculator with logic engine
- Custom battery pack request form
- Interactive FAQ accordion
- Framer Motion page and scroll animations
- Floating WhatsApp button
- Pakistan-specific payment methods (COD, JazzCash, Easypaisa)
- SEO optimized metadata
- Product filtering by category, brand, price, stock

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with Navbar, Footer, CartProvider
│   ├── page.tsx            # Home page
│   ├── shop/page.tsx       # Shop with filters
│   ├── product/[id]/       # Product detail
│   ├── calculator/         # Battery calculator
│   ├── custom-battery/     # Custom pack form
│   ├── about/              # About page
│   ├── contact/            # Contact + FAQ
│   ├── cart/               # Cart page
│   ├── checkout/           # Checkout flow
│   └── blog/               # Blog articles
├── components/
│   ├── layout/             # Navbar, Footer
│   ├── home/               # Hero, Features, Categories, etc.
│   ├── shop/               # ProductCard, ProductFilters
│   └── ui/                 # WhatsAppButton
├── context/
│   └── CartContext.tsx      # Cart state management
├── data/
│   └── products.ts         # Product catalog + reviews
└── types/
    └── index.ts            # TypeScript interfaces
```
