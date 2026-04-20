-- Tabella alimenti da OpenFoodFacts (filtrati, ~44k record)
CREATE TABLE IF NOT EXISTS public.alimenti (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name    TEXT NOT NULL,
  brands          TEXT,
  categories_en   TEXT,
  pnns_groups_1   TEXT,
  nova_group      TEXT,
  nutriscore_grade TEXT,
  energy_kcal_100g NUMERIC,
  fat_100g        NUMERIC,
  proteins_100g   NUMERIC,
  carbs_100g      NUMERIC,
  sugars_100g     NUMERIC,
  fiber_100g      NUMERIC,
  salt_100g       NUMERIC,
  -- pasti in cui questo alimento può comparire (colazione|pranzo|cena|spuntino)
  meal_slots      TEXT DEFAULT 'pranzo,cena',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per query veloci
CREATE INDEX IF NOT EXISTS alimenti_pnns_idx   ON public.alimenti (pnns_groups_1);
CREATE INDEX IF NOT EXISTS alimenti_name_idx   ON public.alimenti USING gin(to_tsvector('italian', product_name));
CREATE INDEX IF NOT EXISTS alimenti_slots_idx  ON public.alimenti (meal_slots);

-- RLS: lettura pubblica a tutti gli utenti autenticati
ALTER TABLE public.alimenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alimenti leggibili da tutti" ON public.alimenti
  FOR SELECT USING (auth.role() = 'authenticated');
-- Policy permissiva per l'import iniziale (può essere rimossa dopo)
CREATE POLICY "Import alimenti consentito" ON public.alimenti
  FOR INSERT WITH CHECK (true);
