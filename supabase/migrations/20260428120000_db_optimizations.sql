-- ================================================================
-- Migration 009 — DB Optimizations: RLS + Indexes
-- Supabase project: dcwchgzxuzfywkxsadjp
-- Idempotente: ENABLE RLS è no-op se già attivo;
--              IF NOT EXISTS per gli indici.
-- ================================================================

-- ----------------------------------------------------------------
-- TASK 1+2 — Abilita RLS sulle tabelle che ne erano prive
-- ----------------------------------------------------------------

ALTER TABLE public.progress_check_domande     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_check_set         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_check_schedulazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_check_risposte    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_esercizio             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pasto_log                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piano_integratori          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integratori_checkin        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrazione_log           ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- POLICIES — create solo se non esistono già
-- ----------------------------------------------------------------

DO $$
BEGIN

  -- ── progress_check_set ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='progress_check_set' AND policyname='Coach gestisce i suoi check-in set') THEN
    CREATE POLICY "Coach gestisce i suoi check-in set"
      ON public.progress_check_set FOR ALL
      USING (coach_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='progress_check_set' AND policyname='Cliente legge i set assegnati') THEN
    CREATE POLICY "Cliente legge i set assegnati"
      ON public.progress_check_set FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.progress_check_schedulazioni pcs
          WHERE pcs.set_id = progress_check_set.id
            AND pcs.cliente_id = auth.uid()
        )
      );
  END IF;

  -- ── progress_check_domande ────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='progress_check_domande' AND policyname='Coach gestisce le sue domande') THEN
    CREATE POLICY "Coach gestisce le sue domande"
      ON public.progress_check_domande FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.progress_check_set pcs
          WHERE pcs.id = progress_check_domande.set_id
            AND pcs.coach_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='progress_check_domande' AND policyname='Cliente legge le domande assegnate') THEN
    CREATE POLICY "Cliente legge le domande assegnate"
      ON public.progress_check_domande FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.progress_check_schedulazioni sch
          WHERE sch.set_id = progress_check_domande.set_id
            AND sch.cliente_id = auth.uid()
        )
      );
  END IF;

  -- ── progress_check_schedulazioni ─────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='progress_check_schedulazioni' AND policyname='Coach gestisce le sue schedulazioni') THEN
    CREATE POLICY "Coach gestisce le sue schedulazioni"
      ON public.progress_check_schedulazioni FOR ALL
      USING (coach_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='progress_check_schedulazioni' AND policyname='Cliente legge le sue schedulazioni') THEN
    CREATE POLICY "Cliente legge le sue schedulazioni"
      ON public.progress_check_schedulazioni FOR SELECT
      USING (cliente_id = auth.uid());
  END IF;

  -- ── progress_check_risposte ───────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='progress_check_risposte' AND policyname='Cliente gestisce le sue risposte') THEN
    CREATE POLICY "Cliente gestisce le sue risposte"
      ON public.progress_check_risposte FOR ALL
      USING (cliente_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='progress_check_risposte' AND policyname='Coach legge le risposte dei suoi clienti') THEN
    CREATE POLICY "Coach legge le risposte dei suoi clienti"
      ON public.progress_check_risposte FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.progress_check_schedulazioni pcs
          WHERE pcs.id = progress_check_risposte.schedulazione_id
            AND pcs.coach_id = auth.uid()
        )
      );
  END IF;

  -- ── note_esercizio ────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='note_esercizio' AND policyname='Cliente gestisce le sue note esercizio') THEN
    CREATE POLICY "Cliente gestisce le sue note esercizio"
      ON public.note_esercizio FOR ALL
      USING (cliente_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='note_esercizio' AND policyname='Coach legge note dei suoi clienti') THEN
    CREATE POLICY "Coach legge note dei suoi clienti"
      ON public.note_esercizio FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.coach_clienti cc
          WHERE cc.coach_id = auth.uid()
            AND cc.cliente_id = note_esercizio.cliente_id
        )
      );
  END IF;

  -- ── pasto_log ─────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pasto_log' AND policyname='Cliente gestisce il suo pasto log') THEN
    CREATE POLICY "Cliente gestisce il suo pasto log"
      ON public.pasto_log FOR ALL
      USING (cliente_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pasto_log' AND policyname='Coach legge pasto log dei suoi clienti') THEN
    CREATE POLICY "Coach legge pasto log dei suoi clienti"
      ON public.pasto_log FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.coach_clienti cc
          WHERE cc.coach_id = auth.uid()
            AND cc.cliente_id = pasto_log.cliente_id
        )
      );
  END IF;

  -- ── piano_integratori ─────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='piano_integratori' AND policyname='Coach gestisce piano integratori') THEN
    CREATE POLICY "Coach gestisce piano integratori"
      ON public.piano_integratori FOR ALL
      USING (coach_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='piano_integratori' AND policyname='Cliente legge il suo piano integratori') THEN
    CREATE POLICY "Cliente legge il suo piano integratori"
      ON public.piano_integratori FOR SELECT
      USING (cliente_id = auth.uid());
  END IF;

  -- ── integratori_checkin ───────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='integratori_checkin' AND policyname='Cliente gestisce i suoi checkin integratori') THEN
    CREATE POLICY "Cliente gestisce i suoi checkin integratori"
      ON public.integratori_checkin FOR ALL
      USING (cliente_id = auth.uid());
  END IF;

  -- ── integrazione_log ──────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='integrazione_log' AND policyname='Cliente gestisce il suo log integrazioni') THEN
    CREATE POLICY "Cliente gestisce il suo log integrazioni"
      ON public.integrazione_log FOR ALL
      USING (cliente_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='integrazione_log' AND policyname='Coach legge log integrazioni dei suoi clienti') THEN
    CREATE POLICY "Coach legge log integrazioni dei suoi clienti"
      ON public.integrazione_log FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.coach_clienti cc
          WHERE cc.coach_id = auth.uid()
            AND cc.cliente_id = integrazione_log.cliente_id
        )
      );
  END IF;

END $$;

-- ----------------------------------------------------------------
-- TASK 3 — Indici
-- ----------------------------------------------------------------

-- progress_check_schedulazioni
CREATE INDEX IF NOT EXISTS idx_pcs_cliente_id  ON public.progress_check_schedulazioni (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pcs_data        ON public.progress_check_schedulazioni (data);
CREATE INDEX IF NOT EXISTS idx_pcs_set_id      ON public.progress_check_schedulazioni (set_id);

-- progress_check_risposte
-- (idx_pcr_schedulazione_id già in migration 008 come progress_check_risposte_schedulazione_id_idx)
CREATE INDEX IF NOT EXISTS idx_pcr_schedulazione_id ON public.progress_check_risposte (schedulazione_id);
CREATE INDEX IF NOT EXISTS idx_pcr_cliente_id       ON public.progress_check_risposte (cliente_id);

-- JSONB GIN su progress_check_risposte.risposte (confermato colonna JSONB)
CREATE INDEX IF NOT EXISTS idx_pcr_risposte_gin ON public.progress_check_risposte USING gin(risposte);

-- note_esercizio
CREATE INDEX IF NOT EXISTS idx_note_esercizio_cliente_id  ON public.note_esercizio (cliente_id);
CREATE INDEX IF NOT EXISTS idx_note_esercizio_sessione_id ON public.note_esercizio (sessione_id);

-- carb_cycling
CREATE INDEX IF NOT EXISTS idx_cc_override_cliente_data ON public.carb_cycling_override (cliente_id, data);
CREATE INDEX IF NOT EXISTS idx_cc_giorni_piano_id       ON public.carb_cycling_giorni   (piano_id);

-- piano_integratori — query più comune: .eq(cliente_id).eq(attivo, true)
CREATE INDEX IF NOT EXISTS idx_piano_int_cliente_attivo ON public.piano_integratori (cliente_id, attivo);

-- integratori_checkin — query: .eq(cliente_id).eq(data, oggi)
CREATE INDEX IF NOT EXISTS idx_integratori_checkin_cliente_data ON public.integratori_checkin (cliente_id, data);

-- integrazione_log — query: .eq(cliente_id).gte(data, ...)
CREATE INDEX IF NOT EXISTS idx_integrazione_log_cliente_data ON public.integrazione_log (cliente_id, data);

-- ── Colonne non esistenti — indici saltati con spiegazione ──────
-- idx_sessioni_scheda_id:    sessioni NON ha colonna scheda_id
--                            (ha assegnazione_id → usa assegnazioni_cliente_id_idx)
-- idx_sessioni_created_at:   sessioni NON ha created_at, usa 'data'
--                            (già coperto da sessioni_cliente_data_idx di migration 008)
-- idx_scheda_esercizi_scheda_id: scheda_esercizi NON ha scheda_id
--                            (ha giorno_id → usa scheda_esercizi_giorno_id_idx di migration 008)
-- idx_sessioni_cliente_id:   già creato come sessioni_cliente_id_idx in migration 008
