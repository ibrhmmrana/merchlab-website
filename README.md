# MerchLab - Premium Merchandise Solutions

A modern e-commerce platform built with Next.js 14, Tailwind CSS, and shadcn/ui for premium merchandise and promotional products.

## Features

- 🛍️ **Product Catalog**: Browse products with filtering, search, and category navigation
- 🛒 **Shopping Cart**: Add products with variant selection (color, size, quantity)
- 📱 **Responsive Design**: Mobile-first design with touch-friendly interactions
- 🎨 **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- 📦 **Quote System**: Submit quote requests for bulk orders
- 🔄 **State Management**: Zustand for cart state persistence
- 🖼️ **Image Optimization**: Next.js Image component with remote patterns

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Icons**: Lucide React
- **Database**: Supabase (configured)
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd merchlab
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in the environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   MERCHLAB_QUOTE_WEBHOOK=your_webhook_url
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── cart/              # Cart page
│   ├── contact/           # Contact page
│   ├── shop/              # Shop page
│   ├── globals.css        # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── CartDrawer.tsx     # Shopping cart drawer
│   ├── ProductCard.tsx    # Product display card
│   ├── VariantPicker.tsx  # Product variant selector
│   └── ...                # Other components
├── lib/                   # Utility libraries
│   ├── data/              # Data layer (mock data)
│   ├── supabase/          # Supabase client config
│   └── utils.ts           # Utility functions
└── store/                 # State management
    └── cart.ts            # Cart store (Zustand)
```

## Key Features

### Product Catalog
- Product grid with hover effects
- Color and size variant selection
- Stock status indicators
- Price display with discounts
- Mobile-optimized variant modals

### Shopping Cart
- Persistent cart state
- Quantity management
- Item removal
- Cart drawer for quick access
- Order summary page

### Quote System
- Customer information form
- Shipping address collection
- Quote submission to webhook
- Form validation

## Customization

### Brand Colors
The brand colors are defined in `src/app/globals.css`:
- Primary: `#1062FF` (--brand)
- Primary Dark: `#0d4ed8` (--brand-ink)
- Neutral: `#111827` (--ink)
- Muted: `#6B7280` (--muted)

### Adding New Components
Use the shadcn/ui CLI to add new components:
```bash
npx shadcn@latest add [component-name]
```

### Mock Data
Current implementation uses mock data in `src/lib/data/__mocks__.ts`. Replace with real Supabase queries in `src/lib/data/products.ts`.

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
The app is compatible with any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `MERCHLAB_QUOTE_WEBHOOK` | Webhook URL for quote submissions | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email info@merchlab.com or create an issue in the repository.
