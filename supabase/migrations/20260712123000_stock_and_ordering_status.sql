-- Quantità disponibile (scorta) per specialità e panettoni.
-- NULL = quantità illimitata/non tracciata, 0 = esaurito (nascosto dalla vetrina pubblica).
ALTER TABLE public.specialties ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE public.panettoni ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE public.specialties ADD CONSTRAINT specialties_quantity_check CHECK (quantity IS NULL OR quantity >= 0);
ALTER TABLE public.panettoni ADD CONSTRAINT panettoni_quantity_check CHECK (quantity IS NULL OR quantity >= 0);

-- Stato ordini: interruttori per sospendere temporaneamente le prenotazioni
-- per categoria, senza dover disattivare i singoli prodotti. Riga singola (singleton).
CREATE TABLE public.ordering_status (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  standard_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  torta_personalizzata_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  panettone_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.ordering_status (id) VALUES (TRUE);

GRANT SELECT ON public.ordering_status TO anon, authenticated;
GRANT UPDATE ON public.ordering_status TO authenticated;
GRANT ALL ON public.ordering_status TO service_role;
ALTER TABLE public.ordering_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ordering status" ON public.ordering_status
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Admins update ordering status" ON public.ordering_status
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
