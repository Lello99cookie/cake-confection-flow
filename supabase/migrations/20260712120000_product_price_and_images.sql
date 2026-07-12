-- Prezzo numerico per specialità e panettoni (in aggiunta al vecchio price_hint testuale)
ALTER TABLE public.specialties ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
ALTER TABLE public.panettoni ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

-- Bucket storage pubblico per le immagini prodotto (upload da parte degli admin)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Lettura pubblica delle immagini (necessaria per mostrarle sul sito)
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

-- Solo gli admin possono caricare/sostituire/eliminare immagini prodotto
CREATE POLICY "Admins manage product images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
