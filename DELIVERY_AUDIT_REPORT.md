# MerchLab Delivery Audit Report
**Date:** 2025-01-27  
**Purpose:** Extract accurate "what was built + how hard it was" snapshot for estimating similar products

---

## 1. Architecture Map

### Runtime & Hosting
- **Framework:** Next.js 15.5.7 (App Router) with React 19.1.0
- **Runtime:** Node.js (explicitly set to `nodejs` in several API routes)
- **Hosting:** Vercel-ready (vercel.json.example shows cron job configuration)
- **Build Tool:** Turbopack (used in dev/build scripts)
- **Language:** TypeScript 5

### Environment Variables
**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)
- `OPENAI_API_KEY` - OpenAI API key (for WhatsApp/email AI agent)
- `OPENAI_EMBEDDING_MODEL` - Optional, defaults to 'text-embedding-3-small'
- `BARRON_CLIENT_ID` - Barron OAuth client ID
- `BARRON_CLIENT_SECRET` - Barron OAuth client secret
- `BARRON_REFRESH_TOKEN` - Barron refresh token (optional, stored in Supabase)
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp Business API access token
- `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_BUSINESS_ACCOUNT_ID` - WhatsApp phone number ID
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` - Webhook verification token
- `MERCHLAB_QUOTE_WEBHOOK` - Webhook URL for quote submissions
- `WEBHOOK_RESEND_INVOICE_URL` - Optional, defaults to 'https://ai.intakt.co.za/webhook/resend-quote'
- `N8N_PDF_URL` - URL for PDF generation service
- `REPORT_BRAND_LOGO_URL` - Optional, for order export reports
- `REPORT_SIG_LOGO_URL` - Optional, for order export reports
- `NEXT_PUBLIC_APP_URL` / `VERCEL_URL` - App base URL (for internal API calls)

### Routes List

#### Public API Routes
- `/api/quote` (POST) - Submit quote requests (unbranded items)
- `/api/quote/[quoteNo]` (GET) - Retrieve quote by number
- `/api/build-quote` (POST) - Build and save/send quotes
- `/api/product-price` (GET) - Get product price by stockId (Barron API integration)
- `/api/product-features` (GET) - Get product features by stockHeaderId (Barron API integration)
- `/api/branding-pricing` (GET) - Get branding pricing information
- `/api/branding/vectorize` (POST) - Vectorize artwork images to SVG
- `/api/upload-branding` (POST) - Upload branding artwork
- `/api/save-branding-selection` (POST) - Save branding selections to Supabase
- `/api/whatsapp/webhook` (POST/GET) - WhatsApp webhook endpoint
- `/api/whatsapp/debug` (GET/POST) - WhatsApp debug endpoint
- `/api/email/poll` (GET) - Email polling endpoint (cron job, runs every 5 minutes)

#### Admin API Routes (Protected)
- `/api/admin/login` (POST) - Admin authentication
- `/api/admin/logout` (POST) - Admin logout
- `/api/admin/env-check` (GET) - Environment variable check
- `/api/admin/metrics` (GET) - Dashboard metrics
- `/api/admin/orders` (GET) - List orders from Barron API
- `/api/admin/orders/status-counts` (GET) - Order status counts
- `/api/admin/orders/delivery-status/[orderId]` (GET) - Delivery status for specific order
- `/api/admin/orders/export` (GET) - Export orders to PDF
- `/api/admin/orders/get-refresh-token` (GET) - Get Barron refresh token
- `/api/admin/orders/exchange-code` (POST) - Exchange OAuth code for tokens
- `/api/admin/quotes` (GET) - List quotes
- `/api/admin/quotes/[quoteNo]` (GET) - Get specific quote
- `/api/admin/quotes/resend` (POST) - Resend quote PDF
- `/api/admin/invoices` (GET) - List invoices
- `/api/admin/invoices/resend` (POST) - Resend invoice PDF
- `/api/admin/customers` (GET) - List customers
- `/api/admin/customers/[customerKey]/invoices` (GET) - Customer invoices
- `/api/admin/whatsapp/conversations` (GET) - List WhatsApp conversations
- `/api/admin/whatsapp/conversations/[sessionId]` (GET) - Get conversation by session ID
- `/api/admin/whatsapp/customer-activity` (GET) - Customer activity data
- `/api/admin/whatsapp/send-message` (POST) - Send WhatsApp message
- `/api/admin/whatsapp/human-control` (GET/POST) - Human control toggle for conversations
- `/api/admin/whatsapp/debug` (GET/POST) - WhatsApp debug endpoint
- `/api/admin/linkedin/search` (POST) - LinkedIn profile search
- `/api/admin/linkedin/profile` (GET) - Get LinkedIn profile
- `/api/admin/linkedin/webhook` (POST) - LinkedIn webhook (currently disabled)
- `/api/admin/gmail/inbox` (GET) - Gmail inbox
- `/api/admin/gmail/messages/[id]` (GET) - Gmail message details
- `/api/admin/report` (GET) - Generate reports

#### Debug Routes
- `/api/debug/supabase` (GET) - Test Supabase connection and RPC functions
- `/api/debug/knowledge-base` (GET/POST) - Test knowledge base search
- `/api/debug/knowledge-base-rpc` (GET) - Test knowledge base RPC function

### Key Middleware
- **Admin Auth:** `src/lib/adminAuth.ts` - Session-based admin authentication
- **Session Management:** `src/lib/session.ts` - Session token management
- **Supabase Clients:**
  - `src/lib/supabase/server.ts` - Server-side Supabase client (no session persistence)
  - `src/lib/supabase/browser.ts` - Browser-side Supabase client (no session persistence)

### Supabase Usage Patterns

#### Tables Used
- `products_flat` - Product catalog (stock_id, stock_header_id, colour, size, prices, images, etc.)
- `whatsapp_messages` - WhatsApp conversation history
- `whatsapp_human_control` - Human control state for WhatsApp conversations
- `email_processing_log` - Email processing tracking
- `api_tokens` - API token storage (for Barron refresh tokens)
- `branding_selections` - Branding selections for quotes
- `linkedin_profiles` - LinkedIn profile data (optional feature)

#### RPC Functions Called
- `get_catalog_facets()` - Get product catalog facets (categories, types, brands, colours, sizes, etc.)
- `search_products_grouped()` - Search and filter products with pagination
- `get_colour_images_for_group()` - Get color images for a product group
- `get_branding_positions()` - Get available branding positions for a product
- `get_branding_types()` - Get branding types for a position
- `get_branding_sizes()` - Get branding sizes for a position/type combination
- `save_branding_selection()` - Save branding selection to database
- `get_quote_branding_selections()` - Retrieve branding selections for a quote
- `search_knowledge_base()` - Vector search in knowledge base (for AI agent)

#### Query Locations
- **Product Catalog:** `src/lib/data/products.ts`
- **Branding:** `src/lib/branding.ts`
- **WhatsApp:** `src/lib/whatsapp/*.ts` (multiple files)
- **Orders/Quotes/Invoices:** `src/lib/whatsapp/orderStatus.ts`, `quoteInfo.ts`, `invoiceInfo.ts`
- **Knowledge Base:** `src/lib/whatsapp/knowledgeBase.ts`
- **Direct PostgREST:** `src/lib/postgrest.ts` - Direct REST API calls bypassing Supabase client

---

## 2. Top 5 Most Technically Complex Areas

### 1. WhatsApp AI Agent System
**Location:** `src/lib/whatsapp/aiAgent.ts` (1,525 lines), `src/app/api/whatsapp/webhook/route.ts` (508 lines)

**What it does:**
- Processes incoming WhatsApp messages via webhook
- Uses OpenAI GPT-4o-mini with function calling to handle customer inquiries
- Supports 8+ tools: order status, quote info, invoice info, customer account, order details, delivery info, escalation, knowledge base search
- Maintains conversation history in Postgres
- Handles human control toggle (bypasses AI when human is in control)
- Sends PDFs (quotes/invoices) via WhatsApp document API
- Auto-detects customer phone/email from context for tool calls

**Why it's complex:**
- **Multiple webhook formats:** Handles 5 different webhook payload formats (direct array, standard WhatsApp API, BotPenguin/n8n, nested body, direct format)
- **Complex tool orchestration:** Each tool requires specific argument parsing, error handling, and response formatting
- **State management:** Human control state, conversation history, customer context injection
- **PDF handling:** Special logic for sending PDFs vs text messages, with fallback handling
- **Type safety:** Extensive type guards (`instanceof Error`, `as unknown`, function type checks) throughout
- **Edge cases:** Phone number normalization, quote/invoice number parsing (multiple formats: "Q553-HFKTH", "ML-DM618", "INV-Q553-HFKTH")
- **Latency concerns:** Multiple OpenAI API calls per message (initial call + tool execution + final response), Postgres queries for history

**Likely bugs/issues encountered:**
- Webhook format detection failures (5 different formats suggest iteration)
- Type errors with tool call responses (extensive type guards indicate runtime type issues)
- Phone number format mismatches (normalization code in multiple places)
- PDF sending failures (fallback logic suggests failures occurred)
- Conversation context loss (customer info injection logic suggests this was a problem)
- Human control state race conditions (explicit checks suggest timing issues)

---

### 2. Cart State Management with Branding
**Location:** `src/store/cart.ts` (184 lines), `src/app/cart/CartClient.tsx` (962 lines)

**What it does:**
- Manages shopping cart with Zustand + localStorage persistence
- Separates branded vs unbranded items into two groups
- Handles complex branding selections (position, type, size, color count, artwork upload, vectorization)
- Validates branded items before submission
- Builds different payload formats for branded vs unbranded quotes
- Manages active cart group state (branded/unbranded) with URL sync

**Why it's complex:**
- **Dual cart system:** Branded and unbranded items must be kept separate but in same store
- **Branding state complexity:** Each item can have multiple branding positions, each with type/size/color/artwork
- **Persistence edge cases:** Hydration issues, localStorage sync, derived state computation
- **Stock ID resolution:** Cart items must have correct `stock_id` (not `stock_header_id`) - extensive repair logic in quote submission
- **Payload building:** Two completely different payload structures (branded has nested brandingItems array)
- **UI state synchronization:** Active group, URL params, form state, validation state all must stay in sync
- **Vectorization integration:** Auto-vectorizes artwork when details screen opens (async, error-prone)

**Likely bugs/issues encountered:**
- Stock ID mismatches (extensive `ensureStockIds` repair function in quote API)
- Cart hydration race conditions (hydration guards throughout)
- Branding validation failures (complex validation function suggests edge cases)
- Vectorization failures (error handling and retry logic)
- URL state desync (refs and effects to prevent loops)
- Branded payload format errors (extensive logging suggests debugging was needed)

---

### 3. Barron API Integration (Product Data & Orders)
**Location:** `src/lib/whatsapp/barronAuth.ts`, `src/app/api/product-price/route.ts`, `src/app/api/product-features/route.ts`, `src/app/api/admin/orders/route.ts`

**What it does:**
- OAuth 2.0 authentication with Barron API (client credentials flow)
- Fetches product prices by stockId (requires login cookie + retry logic)
- Fetches product features by stockHeaderId (XML parsing, JSON extraction)
- Fetches orders from Barron API (multiple response format handling)
- Caches authentication tokens and cookies (with expiry management)
- Handles multiple API response structures (array vs object, nested results)

**Why it's complex:**
- **Dual authentication:** OAuth tokens for orders API, cookie-based auth for product APIs
- **Cookie management:** Login endpoint returns cookies that must be cached and refreshed
- **XML parsing:** Product features API returns XML with escaped JSON inside
- **Response format variations:** Orders API returns different structures (array[0].results vs object.results)
- **Retry logic:** Both price and features APIs have retry mechanisms (2 retries, cookie refresh on 401)
- **Caching complexity:** Cookie expiry (5 min TTL), token caching, price/features caching (different TTLs)
- **Type safety:** Extensive type guards for API responses (`as unknown`, `instanceof` checks)
- **Error handling:** Network timeouts (10s), 401 handling, XML parsing failures

**Likely bugs/issues encountered:**
- Cookie expiry issues (cookie caching with TTL suggests failures)
- XML parsing failures (regex extraction suggests fragile parsing)
- Response format mismatches (multiple format handlers indicate API inconsistencies)
- Token refresh failures (refresh token storage in Supabase suggests persistence issues)
- Timeout issues (explicit 10s timeout suggests slow API responses)
- Type errors (extensive type guards indicate runtime type issues)

---

### 4. Branding System (Upload, Vectorization, Selection)
**Location:** `src/app/branding/BrandingSheet.tsx` (790 lines), `src/app/api/branding/vectorize/route.ts`, `src/app/api/upload-branding/route.ts`

**What it does:**
- Allows users to select branding positions, types, sizes for products
- Uploads artwork images (drag-and-drop, file input)
- Auto-vectorizes raster images to SVG (via external API)
- Saves branding selections to Supabase with artwork URLs
- Validates branding selections (color count rules, required fields)
- Integrates with cart to build branded quote payloads

**Why it's complex:**
- **Multi-step UI flow:** Position selection → Type selection → Size selection → Artwork upload → Vectorization
- **Async vectorization:** Auto-vectorizes on details screen open (race conditions, loading states)
- **File type handling:** Skips vectorization for PDF/.ai files, handles different image formats
- **State management:** Per-position drafts, upload states, vectorization states, error states
- **Database integration:** Saves selections to Supabase, retrieves for quote building
- **Payload complexity:** Branding selections must map to complex nested payload structure
- **Error recovery:** Vectorization failures, upload failures, network errors all need handling
- **UI complexity:** Tabs, modals, drag-and-drop, file validation, progress indicators

**Likely bugs/issues encountered:**
- Vectorization race conditions (loading refs to prevent duplicates)
- File type detection failures (explicit PDF/.ai checks suggest issues)
- Upload timeout/failure (error states suggest network issues)
- Database save failures (try-catch around DB operations)
- Artwork URL mismatches (logo_file vs artwork_url preference logic)
- State persistence issues (draft state management complexity)

---

### 5. Quote Submission & Stock ID Resolution
**Location:** `src/app/api/quote/route.ts` (264 lines), `src/app/cart/CartClient.tsx` (submitQuote function)

**What it does:**
- Receives quote submissions from cart (unbranded items)
- Validates and repairs stock IDs (ensures stock_id ≠ stock_header_id)
- Queries Supabase to find correct stock_id by colour/size matching
- Builds webhook payload with fixed stock IDs
- Handles branded vs unbranded quote submissions differently
- Sends to external webhook (ai.intakt.co.za)

**Why it's complex:**
- **Stock ID resolution:** Must match items by stock_header_id + colour + size to find correct stock_id
- **Data inconsistency:** Cart items often have wrong stock_id (same as stock_header_id)
- **Colour normalization:** Handles colour variations ("Red/Blue" → "red"), case insensitivity
- **Size normalization:** Handles size variations, whitespace, case
- **Batch processing:** Fetches all variants for headers in one query, then matches locally
- **Error handling:** Throws if resolution fails (hard assertion), logs extensively
- **Payload transformation:** Must rebuild entire payload with fixed IDs
- **Dual submission paths:** Branded quotes go to different webhook with different payload structure

**Likely bugs/issues encountered:**
- Stock ID mismatches causing quote failures (extensive repair logic)
- Colour/size matching failures (normalization suggests data inconsistencies)
- Webhook payload format errors (extensive logging suggests debugging)
- Batch query performance (switched from per-item queries to batch)
- Hard assertion failures (throws on resolution failure - suggests production issues)
- Payload serialization issues (double JSON.stringify suggests problems)

---

## 3. Evidence of Iteration History

### Multiple Versions / Patched Fixes

1. **Stock ID Resolution (`src/app/api/quote/route.ts`):**
   - `ensureStockIds()` function added to repair wrong stock IDs
   - Extensive logging: "Original items before fix", "Fixed items after repair"
   - Hard assertion that throws if resolution fails (suggests production failures)
   - Batch query optimization (was likely per-item queries before)

2. **WhatsApp Webhook Format Handling (`src/app/api/whatsapp/webhook/route.ts`):**
   - 5 different webhook format handlers (Format 1-5)
   - Extensive logging for format detection
   - Comments indicate: "Direct WhatsApp Business API", "BotPenguin/n8n webhook format", "Nested body format"
   - Suggests multiple integrations/iterations

3. **Cart Hydration Guards (`src/store/cart.ts`, `src/app/cart/CartClient.tsx`):**
   - `_hasHydrated` flag in store
   - `useHasHydrated()` hook
   - Multiple hydration checks before rendering
   - Suggests SSR/hydration mismatches were a problem

4. **Type Guards Throughout Codebase:**
   - 114 instances of `instanceof Error` checks
   - Extensive `as unknown` casts (especially in Barron API responses)
   - Function type guards in AI agent (`toolCall.type === 'function' && 'function' in toolCall`)
   - Suggests runtime type errors were common

5. **Barron API Response Format Handling:**
   - Multiple format handlers: `Array.isArray(data) && data[0].results` vs `data.results`
   - Extensive logging of response structure
   - Suggests API response format changed or was inconsistent

6. **LinkedIn Integration (Disabled):**
   - Large commented-out block in `src/app/api/quote/route.ts` (lines 207-250)
   - Comment: "LinkedIn search feature is currently disabled"
   - Suggests feature was built but later disabled

7. **Cookie Caching for Barron Product APIs:**
   - Cookie expiry management (5 min TTL)
   - Cookie refresh on 401 errors
   - Suggests cookie expiry was causing failures

8. **Vectorization Auto-Retry Logic:**
   - `vectorized` state to prevent duplicate calls
   - Error handling with state reset for retry
   - Suggests vectorization failures were common

### TODOs and Commented Code

1. **TODO in `src/app/api/admin/invoices/resend/route.ts`:**
   ```typescript
   // TODO: Update this URL once the resend-invoice webhook is created and active
   ```

2. **Commented LinkedIn Integration:**
   - 44 lines of commented code in quote submission
   - Includes async fetch with error handling
   - Suggests feature was working but disabled

3. **Debug Logging Throughout:**
   - Extensive `console.log` statements (not just errors)
   - "Temporary log for debugging" comments
   - Stock ID verification logging
   - Suggests ongoing debugging was needed

4. **Fallback Logic:**
   - Multiple fallback URL patterns in `next.config.ts` (Azure blob storage)
   - Fallback to text message if PDF sending fails (WhatsApp)
   - Fallback to empty facets if RPC fails (product catalog)
   - Suggests failures were expected and handled

---

## 4. Estimation Anchor Table

| Feature / Area | Complexity | Risk | Notes |
|---------------|------------|------|-------|
| **WhatsApp AI Agent** | L | L | 1,525 lines, 8+ tools, 5 webhook formats, PDF handling, human control state |
| **Cart + Branding System** | L | M | Dual cart groups, complex branding state, vectorization, stock ID resolution |
| **Barron API Integration** | M | M | OAuth + cookie auth, XML parsing, multiple response formats, caching |
| **Product Catalog (Supabase)** | M | S | RPC functions, faceted search, pagination, stock filtering |
| **Quote Submission** | M | M | Stock ID repair, payload building, webhook integration, validation |
| **Admin Dashboard** | M | S | Order management, quote/invoice listing, PDF generation, metrics |
| **Email AI Agent** | M | M | Gmail API integration, email parsing, AI processing, cron polling |
| **Branding Upload/Vectorization** | M | M | File upload, async vectorization, state management, error recovery |
| **LinkedIn Integration** | S | S | Currently disabled, basic search functionality |
| **Knowledge Base (Vector Search)** | M | S | OpenAI embeddings, Supabase vector search, RPC function |
| **WhatsApp Webhook Handler** | M | M | 5 format handlers, message routing, human control checks |
| **Order Status/Details/Invoice Tools** | M | M | Barron API integration, phone/email lookup, PDF URL extraction |
| **Customer Account Info** | S | S | Aggregates quotes/invoices, simple queries |
| **Delivery Info Tool** | S | S | Simple order lookup, address formatting |
| **Escalation System** | S | S | Email sending, conversation context, simple tool |
| **Admin Authentication** | S | S | Session-based, simple middleware |
| **Product Price/Features Caching** | S | M | In-memory cache, TTL management, cache cleanup |
| **Stock ID Resolution** | M | M | Batch queries, colour/size normalization, error handling |
| **Branding Payload Building** | M | M | Complex nested structure, logo_file vs artwork_url logic |
| **Address Autocomplete** | S | S | Google Maps integration, simple component |

**Legend:**
- **Complexity:** S = Small (1-2 days), M = Medium (3-5 days), L = Large (1-2 weeks+)
- **Risk:** S = Low risk, M = Medium risk (known edge cases), L = High risk (complex/unstable)

---

## Summary

**Total Estimated Complexity:** ~12-16 weeks for a senior engineer

**Key Risk Areas:**
1. WhatsApp AI Agent (largest single component, most edge cases)
2. Cart + Branding (complex state management, multiple failure points)
3. Barron API Integration (external dependency, authentication complexity)
4. Stock ID Resolution (data quality issues, matching logic)

**Notable Patterns:**
- Extensive error handling and type guards (suggests production issues)
- Multiple format handlers (suggests API inconsistencies)
- Extensive logging (suggests ongoing debugging needs)
- Disabled features (LinkedIn) suggest scope management
- Fallback logic throughout (suggests defensive programming)

**Architecture Strengths:**
- Clean separation of concerns (lib folders by domain)
- TypeScript throughout (type safety)
- Supabase RPC functions (database logic in DB)
- Caching strategies (performance optimization)

**Architecture Weaknesses:**
- Extensive type guards suggest type system gaps
- Multiple webhook format handlers (technical debt)
- Commented-out code (LinkedIn feature)
- In-memory caching (not distributed, won't scale horizontally)
