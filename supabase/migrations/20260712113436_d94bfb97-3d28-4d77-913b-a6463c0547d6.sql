
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.booking_type AS ENUM ('torta_personalizzata', 'standard', 'panettone');
CREATE TYPE public.booking_status AS ENUM ('da_preparare', 'pronto', 'ritirato', 'annullato');
CREATE TYPE public.soaking_type AS ENUM ('alcolica', 'analcolica', 'latte');

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-assign admin to the first registered user
CREATE OR REPLACE FUNCTION public.handle_new_user_bootstrap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_bootstrap_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_bootstrap();

-- Catalog: specialties
CREATE TABLE public.specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  price_hint TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.specialties TO anon, authenticated;
GRANT ALL ON public.specialties TO service_role;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active specialties" ON public.specialties
  FOR SELECT TO anon, authenticated USING (active = TRUE);
CREATE POLICY "Admins manage specialties" ON public.specialties
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cake bases
CREATE TABLE public.cake_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
GRANT SELECT ON public.cake_bases TO anon, authenticated;
GRANT ALL ON public.cake_bases TO service_role;
ALTER TABLE public.cake_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active bases" ON public.cake_bases
  FOR SELECT TO anon, authenticated USING (active = TRUE);
CREATE POLICY "Admins manage bases" ON public.cake_bases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cake fillings
CREATE TABLE public.cake_fillings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
GRANT SELECT ON public.cake_fillings TO anon, authenticated;
GRANT ALL ON public.cake_fillings TO service_role;
ALTER TABLE public.cake_fillings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active fillings" ON public.cake_fillings
  FOR SELECT TO anon, authenticated USING (active = TRUE);
CREATE POLICY "Admins manage fillings" ON public.cake_fillings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cake sizes
CREATE TABLE public.cake_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  servings INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
GRANT SELECT ON public.cake_sizes TO anon, authenticated;
GRANT ALL ON public.cake_sizes TO service_role;
ALTER TABLE public.cake_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active sizes" ON public.cake_sizes
  FOR SELECT TO anon, authenticated USING (active = TRUE);
CREATE POLICY "Admins manage sizes" ON public.cake_sizes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Panettoni
CREATE TABLE public.panettoni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  price_hint TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
GRANT SELECT ON public.panettoni TO anon, authenticated;
GRANT ALL ON public.panettoni TO service_role;
ALTER TABLE public.panettoni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active panettoni" ON public.panettoni
  FOR SELECT TO anon, authenticated USING (active = TRUE);
CREATE POLICY "Admins manage panettoni" ON public.panettoni
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type public.booking_type NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'da_preparare',
  pickup_at TIMESTAMPTZ NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notes TEXT,
  items JSONB,
  cake_config JSONB
);
GRANT INSERT ON public.bookings TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a booking" ON public.bookings
  FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "Admins can view all bookings" ON public.bookings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete bookings" ON public.bookings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_bookings_pickup_at ON public.bookings(pickup_at);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_type ON public.bookings(type);

-- Seed data
INSERT INTO public.specialties (name, slug, description, image_url, sort_order) VALUES
  ('Sfogliatella Riccia', 'sfogliatella-riccia', 'Croccante sfoglia dorata con ripieno di ricotta, semolino e canditi.', 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=1200&q=80', 10),
  ('Sfogliatella Frolla', 'sfogliatella-frolla', 'Guscio di pasta frolla morbida con classico ripieno napoletano.', 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&w=1200&q=80', 20),
  ('Babà al Rum', 'baba-al-rum', 'Soffice babà artigianale bagnato con rum di qualità.', 'https://images.unsplash.com/photo-1587248720327-8eb72564be1e?auto=format&fit=crop&w=1200&q=80', 30),
  ('Pastiera Napoletana', 'pastiera-napoletana', 'Grano, ricotta e fiori d''arancio: la tradizione di Pasqua tutto l''anno.', 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=1200&q=80', 40),
  ('Coda d''Aragosta', 'coda-di-aragosta', 'Sfoglia croccante farcita con crema chantilly leggera.', 'https://images.unsplash.com/photo-1464195244916-405fa0a82545?auto=format&fit=crop&w=1200&q=80', 50),
  ('Ministeriale', 'ministeriale', 'Medaglione di cioccolato fondente con cuore di crema al liquore Strega.', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80', 60);

INSERT INTO public.cake_bases (name, description, sort_order) VALUES
  ('Pan di Spagna', 'Classico, soffice e leggero.', 10),
  ('Millefoglie', 'Sfoglia croccante a più strati.', 20),
  ('Sacher', 'Base al cioccolato fondente.', 30),
  ('Frolla', 'Base biscottata dorata.', 40),
  ('Meringata', 'Base croccante di meringa.', 50);

INSERT INTO public.cake_fillings (name, description, sort_order) VALUES
  ('Crema Pasticcera', 'La classica crema all''uovo.', 10),
  ('Crema Chantilly', 'Panna montata e vaniglia.', 20),
  ('Crema al Cioccolato', 'Fondente e vellutata.', 30),
  ('Crema allo Zabaione', 'Aromatica con Marsala.', 40),
  ('Crema di Ricotta', 'Tipica napoletana con gocce di cioccolato.', 50),
  ('Crema al Pistacchio', 'Delicata e profumata.', 60);

INSERT INTO public.cake_sizes (label, servings, sort_order) VALUES
  ('Piccola', 6, 10),
  ('Media', 8, 20),
  ('Grande', 10, 30),
  ('Extra', 12, 40),
  ('Maxi', 16, 50),
  ('Party', 20, 60);

INSERT INTO public.panettoni (name, slug, description, image_url, sort_order) VALUES
  ('Panettone Tradizionale', 'tradizionale', 'Lievito madre, canditi e uvetta selezionati. La ricetta classica.', 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=1200&q=80', 10),
  ('Panettone al Cioccolato', 'cioccolato', 'Gocce di cioccolato fondente Valrhona in un impasto soffice.', 'https://images.unsplash.com/photo-1607478900766-efe13248b125?auto=format&fit=crop&w=1200&q=80', 20),
  ('Panettone Crema e Amarena', 'crema-amarena', 'Farcito con crema pasticcera e amarene sciroppate.', 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&w=1200&q=80', 30),
  ('Panettone al Limoncello', 'limoncello', 'Aromatico con crema al limoncello di Sorrento.', 'https://images.unsplash.com/photo-1587248720327-8eb72564be1e?auto=format&fit=crop&w=1200&q=80', 40),
  ('Panettone Pere e Cioccolato', 'pere-cioccolato', 'Pere caramellate e cioccolato fondente.', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80', 50);
