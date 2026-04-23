-- Migration 006: tabelle per NutrizioneModal con versioning diete

-- Tabella principale: dieta versionata per cliente
CREATE TABLE IF NOT EXISTS public.diete (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id                UUID REFERENCES public.profiles(id),
  data_inizio             DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fine               DATE,
  calorie                 INT,
  proteine_g              INT,
  carboidrati_g           INT,
  grassi_g                INT,
  note_coach              TEXT,
  pasti_config            JSONB DEFAULT '[]'::jsonb,
  carb_cycling_abilitato  BOOLEAN DEFAULT FALSE,
  carb_cycling_start_date DATE,
  delta_peso_kg           NUMERIC(5,2),   -- variazione peso nel periodo (consuntivo)
  outcome_note            TEXT,            -- nota outcome alla chiusura
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Profili macro per carb cycling (per singola versione dieta)
CREATE TABLE IF NOT EXISTS public.dieta_profili_macro (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dieta_id  UUID NOT NULL REFERENCES public.diete(id) ON DELETE CASCADE,
  label     TEXT NOT NULL,   -- 'A', 'B', 'C' ...
  kcal      INT  NOT NULL DEFAULT 0,
  prot      INT  NOT NULL DEFAULT 0,
  carb      INT  NOT NULL DEFAULT 0,
  grassi    INT  NOT NULL DEFAULT 0,
  color     TEXT DEFAULT 'oklch(0.70 0.19 46)'
);

-- Ciclo 7 giorni: assegna profilo a ogni giorno del ciclo
CREATE TABLE IF NOT EXISTS public.dieta_ciclo (
  dieta_id   UUID     NOT NULL REFERENCES public.diete(id) ON DELETE CASCADE,
  giorno     SMALLINT NOT NULL CHECK (giorno BETWEEN 1 AND 7),
  profilo_id UUID     REFERENCES public.dieta_profili_macro(id) ON DELETE SET NULL,
  PRIMARY KEY (dieta_id, giorno)
);

-- Indici
CREATE INDEX IF NOT EXISTS diete_cliente_id_idx      ON public.diete(cliente_id);
CREATE INDEX IF NOT EXISTS diete_data_inizio_idx     ON public.diete(data_inizio);
CREATE INDEX IF NOT EXISTS dieta_profili_dieta_idx   ON public.dieta_profili_macro(dieta_id);

-- RLS
ALTER TABLE public.diete ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dieta_profili_macro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dieta_ciclo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente legge le sue diete" ON public.diete
  FOR SELECT USING (cliente_id = auth.uid());

CREATE POLICY "Coach gestisce diete dei suoi clienti" ON public.diete
  FOR ALL USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.coach_clienti
      WHERE coach_id = auth.uid() AND cliente_id = diete.cliente_id
    )
  );

CREATE POLICY "Coach gestisce profili macro" ON public.dieta_profili_macro
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.diete d
      JOIN public.coach_clienti cc ON cc.cliente_id = d.cliente_id
      WHERE d.id = dieta_profili_macro.dieta_id AND cc.coach_id = auth.uid()
    )
  );

CREATE POLICY "Cliente legge profili macro" ON public.dieta_profili_macro
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.diete d
      WHERE d.id = dieta_profili_macro.dieta_id AND d.cliente_id = auth.uid()
    )
  );

CREATE POLICY "Coach gestisce ciclo" ON public.dieta_ciclo
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.diete d
      JOIN public.coach_clienti cc ON cc.cliente_id = d.cliente_id
      WHERE d.id = dieta_ciclo.dieta_id AND cc.coach_id = auth.uid()
    )
  );

CREATE POLICY "Cliente legge ciclo" ON public.dieta_ciclo
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.diete d
      WHERE d.id = dieta_ciclo.dieta_id AND d.cliente_id = auth.uid()
    )
  );
