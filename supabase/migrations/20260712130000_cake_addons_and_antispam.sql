-- Cake sizes: price per size (admin-set, shown to customers in the wizard)
ALTER TABLE public.cake_sizes ADD COLUMN price NUMERIC(10,2);

-- Cake add-ons (e.g. "doppia crema"): fully admin-manageable, optional per-order
CREATE TABLE public.cake_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
GRANT SELECT ON public.cake_addons TO anon, authenticated;
GRANT ALL ON public.cake_addons TO service_role;
ALTER TABLE public.cake_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active addons" ON public.cake_addons
  FOR SELECT TO anon, authenticated USING (active = TRUE);
CREATE POLICY "Admins manage addons" ON public.cake_addons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bookings: collect customer email (used both for confirmations and as an
-- additional anti-spam signal alongside phone/IP) and the submitting IP,
-- captured server-side, never client-supplied.
ALTER TABLE public.bookings ADD COLUMN customer_email TEXT;
ALTER TABLE public.bookings ADD COLUMN client_ip TEXT;
