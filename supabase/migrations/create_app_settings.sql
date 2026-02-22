-- Store app-wide settings (e.g. shop price margin).
-- Accessed via service role from API routes.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT app_settings_pkey PRIMARY KEY (key)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.app_settings
  FOR ALL
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.app_settings IS 'Key-value app settings (e.g. shop_price_margin percentage)';
