-- ============================================
-- FIX: Abilita RLS sulle tabelle mancanti
-- Questi oggetti erano stati creati direttamente
-- sul dashboard senza Row Level Security.
-- ============================================

-- ── macro_target ──────────────────────────
ALTER TABLE public.macro_target ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente legge il suo macro_target" ON public.macro_target
  FOR SELECT USING (cliente_id = auth.uid());

CREATE POLICY "Coach gestisce macro_target dei suoi clienti" ON public.macro_target
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM coach_clienti
      WHERE coach_id = auth.uid() AND cliente_id = macro_target.cliente_id
    )
  );

-- ── anamnesi ──────────────────────────────
ALTER TABLE public.anamnesi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente gestisce la sua anamnesi" ON public.anamnesi
  FOR ALL USING (cliente_id = auth.uid());

CREATE POLICY "Coach legge anamnesi dei suoi clienti" ON public.anamnesi
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clienti
      WHERE coach_id = auth.uid() AND cliente_id = anamnesi.cliente_id
    )
  );

-- ── carb_cycling_profili ──────────────────
-- piano_id → macro_target.id
ALTER TABLE public.carb_cycling_profili ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente legge profili del suo piano" ON public.carb_cycling_profili
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM macro_target
      WHERE id = carb_cycling_profili.piano_id AND cliente_id = auth.uid()
    )
  );

CREATE POLICY "Coach gestisce profili del piano del cliente" ON public.carb_cycling_profili
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM macro_target
      JOIN coach_clienti ON coach_clienti.cliente_id = macro_target.cliente_id
      WHERE macro_target.id = carb_cycling_profili.piano_id
        AND coach_clienti.coach_id = auth.uid()
    )
  );

-- ── carb_cycling_giorni ───────────────────
-- piano_id → macro_target.id
ALTER TABLE public.carb_cycling_giorni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente legge giorni del suo piano" ON public.carb_cycling_giorni
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM macro_target
      WHERE id = carb_cycling_giorni.piano_id AND cliente_id = auth.uid()
    )
  );

CREATE POLICY "Coach gestisce giorni del piano del cliente" ON public.carb_cycling_giorni
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM macro_target
      JOIN coach_clienti ON coach_clienti.cliente_id = macro_target.cliente_id
      WHERE macro_target.id = carb_cycling_giorni.piano_id
        AND coach_clienti.coach_id = auth.uid()
    )
  );

-- ── carb_cycling_override ─────────────────
ALTER TABLE public.carb_cycling_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente gestisce i suoi override" ON public.carb_cycling_override
  FOR ALL USING (cliente_id = auth.uid());

CREATE POLICY "Coach gestisce override dei suoi clienti" ON public.carb_cycling_override
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM coach_clienti
      WHERE coach_id = auth.uid() AND cliente_id = carb_cycling_override.cliente_id
    )
  );

-- ── push_subscriptions ────────────────────
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente gestisce la sua push subscription" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- ── push_scheduled ────────────────────────
-- Gestita solo via service role (admin), ma RLS va abilitato per togliere l'avviso.
ALTER TABLE public.push_scheduled ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente legge i suoi push schedulati" ON public.push_scheduled
  FOR SELECT USING (user_id = auth.uid());

-- ── appuntamenti ──────────────────────────
-- Letta solo via service role (cron), ma serve RLS abilitato.
ALTER TABLE public.appuntamenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach e cliente vedono i loro appuntamenti" ON public.appuntamenti
  FOR SELECT USING (coach_id = auth.uid() OR cliente_id = auth.uid());

CREATE POLICY "Coach gestisce i suoi appuntamenti" ON public.appuntamenti
  FOR ALL USING (coach_id = auth.uid());

-- ── coach_inviti ──────────────────────────
-- Gestita solo via service role, ma serve RLS abilitato.
ALTER TABLE public.coach_inviti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach gestisce i suoi inviti" ON public.coach_inviti
  FOR ALL USING (coach_id = auth.uid());

CREATE POLICY "Cliente vede gli inviti ricevuti" ON public.coach_inviti
  FOR SELECT USING (cliente_id = auth.uid());

-- ============================================
-- FIX: Rimuovi policy INSERT senza restrizioni
-- su alimenti (era solo per l'import iniziale)
-- ============================================
DROP POLICY IF EXISTS "Import alimenti consentito" ON public.alimenti;
