-- ============================================================
-- Migration 008 — Add missing indexes to reduce Disk IO
-- Supabase project: dcwchgzxuzfywkxsadjp
-- Safe to re-run: CREATE INDEX IF NOT EXISTS + existence checks
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- sessioni  (migration 001)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS sessioni_cliente_id_idx
  ON public.sessioni (cliente_id);

CREATE INDEX IF NOT EXISTS sessioni_cliente_data_idx
  ON public.sessioni (cliente_id, data DESC);

-- ──────────────────────────────────────────────────────────────
-- log_serie  (migration 001)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS log_serie_sessione_id_idx
  ON public.log_serie (sessione_id);

CREATE INDEX IF NOT EXISTS log_serie_scheda_esercizio_id_idx
  ON public.log_serie (scheda_esercizio_id);

-- ──────────────────────────────────────────────────────────────
-- misurazioni  (migration 001)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS misurazioni_cliente_id_idx
  ON public.misurazioni (cliente_id);

CREATE INDEX IF NOT EXISTS misurazioni_cliente_data_idx
  ON public.misurazioni (cliente_id, data DESC);

-- ──────────────────────────────────────────────────────────────
-- checkin  (migration 001 — UNIQUE(cliente_id,data) esiste già
-- ma un idx standalone aiuta le query .in('cliente_id', ids))
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS checkin_cliente_id_idx
  ON public.checkin (cliente_id);

-- ──────────────────────────────────────────────────────────────
-- messaggi  (migration 001 — schema evoluto: coach_id/cliente_id)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS messaggi_coach_id_idx
  ON public.messaggi (coach_id);

CREATE INDEX IF NOT EXISTS messaggi_cliente_id_idx
  ON public.messaggi (cliente_id);

CREATE INDEX IF NOT EXISTS messaggi_coach_cliente_idx
  ON public.messaggi (coach_id, cliente_id, created_at);

-- ──────────────────────────────────────────────────────────────
-- assegnazioni  (migration 001)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS assegnazioni_cliente_id_idx
  ON public.assegnazioni (cliente_id);

CREATE INDEX IF NOT EXISTS assegnazioni_coach_id_idx
  ON public.assegnazioni (coach_id);

CREATE INDEX IF NOT EXISTS assegnazioni_cliente_attiva_idx
  ON public.assegnazioni (cliente_id, attiva);

-- ──────────────────────────────────────────────────────────────
-- scheda_giorni / scheda_esercizi  (migration 001)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS scheda_giorni_scheda_id_idx
  ON public.scheda_giorni (scheda_id);

CREATE INDEX IF NOT EXISTS scheda_esercizi_giorno_id_idx
  ON public.scheda_esercizi (giorno_id);

CREATE INDEX IF NOT EXISTS scheda_esercizi_esercizio_id_idx
  ON public.scheda_esercizi (esercizio_id);

-- ──────────────────────────────────────────────────────────────
-- esercizi / schede  (migration 001)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS esercizi_coach_id_idx
  ON public.esercizi (coach_id);

CREATE INDEX IF NOT EXISTS schede_coach_id_idx
  ON public.schede (coach_id);

-- ──────────────────────────────────────────────────────────────
-- coach_clienti  (migration 001)
-- UNIQUE(coach_id, cliente_id) copre coach_id; aggiungo cliente_id
-- per reverse lookup nelle RLS policy (ogni request authenticated)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS coach_clienti_cliente_id_idx
  ON public.coach_clienti (cliente_id);

-- ──────────────────────────────────────────────────────────────
-- diete  (migration 006 — aggiunge solo coach_id)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS diete_coach_id_idx
  ON public.diete (coach_id);

-- ──────────────────────────────────────────────────────────────
-- Tabelle create fuori dalle migration tracciate
-- Usano DO block con controllo esistenza — safe se la tabella
-- non esiste ancora nel DB.
-- ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- pasto_log
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='pasto_log') THEN
    CREATE INDEX IF NOT EXISTS pasto_log_cliente_id_idx   ON public.pasto_log (cliente_id);
    CREATE INDEX IF NOT EXISTS pasto_log_cliente_data_idx ON public.pasto_log (cliente_id, data);
  END IF;

  -- appuntamenti
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='appuntamenti') THEN
    CREATE INDEX IF NOT EXISTS appuntamenti_coach_id_idx       ON public.appuntamenti (coach_id);
    CREATE INDEX IF NOT EXISTS appuntamenti_coach_data_ora_idx ON public.appuntamenti (coach_id, data_ora);
    CREATE INDEX IF NOT EXISTS appuntamenti_cliente_id_idx     ON public.appuntamenti (cliente_id);
  END IF;

  -- anamnesi
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='anamnesi') THEN
    CREATE INDEX IF NOT EXISTS anamnesi_cliente_id_idx ON public.anamnesi (cliente_id);
  END IF;

  -- progress_check_set
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='progress_check_set') THEN
    CREATE INDEX IF NOT EXISTS progress_check_set_coach_id_idx ON public.progress_check_set (coach_id);
  END IF;

  -- progress_check_schedulazioni
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='progress_check_schedulazioni') THEN
    CREATE INDEX IF NOT EXISTS progress_check_schedulazioni_coach_id_idx   ON public.progress_check_schedulazioni (coach_id);
    CREATE INDEX IF NOT EXISTS progress_check_schedulazioni_coach_data_idx ON public.progress_check_schedulazioni (coach_id, data);
  END IF;

  -- progress_check_risposte
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='progress_check_risposte') THEN
    CREATE INDEX IF NOT EXISTS progress_check_risposte_schedulazione_id_idx ON public.progress_check_risposte (schedulazione_id);
  END IF;

  -- macro_target (tabella legacy, ancora usata da MacroTargetForm)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='macro_target') THEN
    CREATE INDEX IF NOT EXISTS macro_target_cliente_id_idx ON public.macro_target (cliente_id);
  END IF;

END $$;

-- ──────────────────────────────────────────────────────────────
-- RLS fix
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.progress_check_domande ENABLE ROW LEVEL SECURITY;
