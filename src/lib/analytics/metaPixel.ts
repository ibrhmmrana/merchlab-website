/**
 * Meta (Facebook) Pixel – safe client-side helpers.
 * Use from client components only. No-op if fbq is not loaded.
 */

declare global {
  interface Window {
    fbq?: (action: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

function safeFbq(...args: Parameters<NonNullable<typeof window.fbq>>) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args);
  }
}

/** Standard events */
export const metaPixel = {
  /** PageView is already fired in layout. */
  pageView() {
    safeFbq('track', 'PageView');
  },

  /** User viewed a product or product list (category). */
  viewContent(params?: { content_name?: string; content_ids?: string[]; content_type?: string; content_category?: string }) {
    safeFbq('track', 'ViewContent', params);
  },

  /** User added item(s) to cart. */
  addToCart(params: { content_ids?: string[]; content_name?: string; content_type?: string; value?: number; currency?: string; num_items?: number }) {
    safeFbq('track', 'AddToCart', params);
  },

  /** User started checkout (e.g. landed on cart with items). */
  initiateCheckout(params?: { value?: number; currency?: string; num_items?: number }) {
    safeFbq('track', 'InitiateCheckout', params);
  },

  /** Lead: contact form, quote request, enquiry. */
  lead(params?: { content_name?: string; value?: number; currency?: string }) {
    safeFbq('track', 'Lead', params);
  },

  /** User searched. */
  search(params: { search_string: string; content_category?: string }) {
    safeFbq('track', 'Search', params);
  },

  /** Custom: quote submitted (save or send). */
  quoteSubmitted(params?: { action: 'save' | 'send'; num_items?: number; value?: number }) {
    safeFbq('trackCustom', 'QuoteSubmitted', params);
  },

  /** Custom: contact form submitted. */
  contactSubmitted() {
    safeFbq('trackCustom', 'ContactSubmitted', {});
  },
};
