-- Migration 007: centralizza tutto su diete, migra dati da macro_target

-- 1. Inserisce in diete ogni macro_target che non ha ancora una riga in diete
INSERT INTO public.diete (
  cliente_id, coach_id, data_inizio,
  calorie, proteine_g, carboidrati_g, grassi_g,
  note_coach, pasti_config,
  carb_cycling_abilitato, carb_cycling_start_date
)
SELECT
  mt.cliente_id,
  mt.coach_id,
  CURRENT_DATE,
  mt.calorie,
  mt.proteine_g,
  mt.carboidrati_g,
  mt.grassi_g,
  mt.note,
  COALESCE(mt.pasti_config, '[]'::jsonb),
  COALESCE(mt.carb_cycling_abilitato, false),
  mt.carb_cycling_start_date
FROM public.macro_target mt
WHERE NOT EXISTS (
  SELECT 1 FROM public.diete d WHERE d.cliente_id = mt.cliente_id
);

-- 2. Migra profili carb cycling (carb_cycling_profili → dieta_profili_macro)
--    Solo per i piani appena migrati (quelli con data_inizio = CURRENT_DATE)
INSERT INTO public.dieta_profili_macro (dieta_id, label, kcal, prot, carb, grassi, color)
SELECT
  d.id,
  COALESCE(cp.nome, 'A'),
  COALESCE(cp.calorie, 0),
  COALESCE(cp.proteine_g, 0),
  COALESCE(cp.carboidrati_g, 0),
  COALESCE(cp.grassi_g, 0),
  COALESCE(cp.color, 'oklch(0.70 0.19 46)')
FROM public.carb_cycling_profili cp
JOIN public.macro_target mt ON mt.id = cp.piano_id
JOIN public.diete d ON d.cliente_id = mt.cliente_id AND d.data_inizio = CURRENT_DATE
WHERE NOT EXISTS (
  SELECT 1 FROM public.dieta_profili_macro dpm WHERE dpm.dieta_id = d.id
);

-- 3. Migra ciclo 7 giorni (carb_cycling_giorni → dieta_ciclo)
--    Usa la corrispondenza label per mappare profilo_id vecchio → nuovo
INSERT INTO public.dieta_ciclo (dieta_id, giorno, profilo_id)
SELECT
  d.id,
  cg.giorno_ciclo,
  dpm.id
FROM public.carb_cycling_giorni cg
JOIN public.macro_target mt ON mt.id = cg.piano_id
JOIN public.diete d ON d.cliente_id = mt.cliente_id AND d.data_inizio = CURRENT_DATE
JOIN public.carb_cycling_profili cp ON cp.id = cg.profilo_id
JOIN public.dieta_profili_macro dpm
  ON dpm.dieta_id = d.id AND dpm.label = COALESCE(cp.nome, 'A')
WHERE NOT EXISTS (
  SELECT 1 FROM public.dieta_ciclo dc WHERE dc.dieta_id = d.id
)
ON CONFLICT (dieta_id, giorno) DO NOTHING;
