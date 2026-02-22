# MerchLab tracking plan (Meta Pixel + optional analytics)

## What we track

| Event | When | Where |
|-------|------|--------|
| **PageView** | Every page load | Root layout (already implemented) |
| **ViewContent** | Product details modal opened; category/view product list | ProductDetailsModal, Shop/BuildAQuote (category or list view) |
| **AddToCart** | Item added to cart (branded or unbranded) | ProductCard, AddQuoteDialog (add from quote) |
| **InitiateCheckout** | User lands on cart page with items | Cart page (CartClient) |
| **Lead** | Quote submitted, contact form submitted | BuildQuoteClient, CartClient (submit quote), OrderSummary, AddQuoteDialog, Contact page |
| **Search** | User runs search on shop or build-a-quote | Shop page, Build-a-quote page |
| **QuoteSubmitted** (custom) | Quote saved or sent | BuildQuoteClient, CartClient |
| **ContactSubmitted** (custom) | Contact form sent | Contact page |

## User flows covered

1. **Homepage** → PageView; CTAs (Shop, Contact) are just links (no extra event; destination page gets PageView).
2. **Shop / Build a quote** → PageView; search → Search; category filter → ViewContent (content_category); product card click/open modal → ViewContent (product).
3. **Add to cart** (from ProductCard or AddQuoteDialog) → AddToCart (with content_ids, value if available).
4. **Cart drawer** → Opening drawer does not fire InitiateCheckout; going to **Cart page** with items → InitiateCheckout.
5. **Quote submission** (build-quote or cart page) → Lead + QuoteSubmitted.
6. **Contact form** → Lead + ContactSubmitted.

## Implementation notes

- All event calls go through `src/lib/analytics/metaPixel.ts` so we no-op when `fbq` is not loaded.
- Value/currency: use ZAR where we have a total (cart/quote); otherwise omit.
- content_ids: use `stock_header_id` or `stock_id` as string for products.

## Optional future events

- **Purchase** – When you have a confirmed payment (e.g. webhook from PayU), fire Purchase with value and currency.
- **ViewCategory** – Dedicated event when user selects a category (currently covered by ViewContent with content_category).
- **AddPaymentInfo** – If you add a payment step on-site before redirect to gateway.
