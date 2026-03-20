-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('coach', 'cliente');

-- ============================================
-- PROFILES
-- ============================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COACH <-> CLIENTI
-- ============================================

CREATE TABLE coach_clienti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coach_id, cliente_id)
);

-- ============================================
-- ESERCIZI
-- ============================================

CREATE TABLE esercizi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  descrizione TEXT,
  video_url TEXT,
  muscoli TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SCHEDE
-- ============================================

CREATE TABLE schede (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  descrizione TEXT,
  is_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE scheda_giorni (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scheda_id UUID REFERENCES schede(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  ordine INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE scheda_esercizi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  giorno_id UUID REFERENCES scheda_giorni(id) ON DELETE CASCADE NOT NULL,
  esercizio_id UUID REFERENCES esercizi(id) ON DELETE RESTRICT NOT NULL,
  serie INTEGER NOT NULL DEFAULT 3,
  ripetizioni TEXT NOT NULL DEFAULT '8-12',
  recupero_secondi INTEGER DEFAULT 90,
  note TEXT,
  ordine INTEGER NOT NULL DEFAULT 0
);

-- ============================================
-- ASSEGNAZIONI
-- ============================================

CREATE TABLE assegnazioni (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scheda_id UUID REFERENCES schede(id) ON DELETE RESTRICT NOT NULL,
  cliente_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  data_inizio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fine DATE,
  attiva BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SESSIONI & LOG
-- ============================================

CREATE TABLE sessioni (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assegnazione_id UUID REFERENCES assegnazioni(id) ON DELETE CASCADE NOT NULL,
  giorno_id UUID REFERENCES scheda_giorni(id) ON DELETE CASCADE NOT NULL,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note TEXT,
  completata BOOLEAN DEFAULT FALSE
);

CREATE TABLE log_serie (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sessione_id UUID REFERENCES sessioni(id) ON DELETE CASCADE NOT NULL,
  scheda_esercizio_id UUID REFERENCES scheda_esercizi(id) ON DELETE CASCADE NOT NULL,
  numero_serie INTEGER NOT NULL,
  peso_kg DECIMAL(6,2),
  ripetizioni INTEGER,
  completata BOOLEAN DEFAULT FALSE,
  note TEXT
);

-- ============================================
-- MISURAZIONI
-- ============================================

CREATE TABLE misurazioni (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_kg DECIMAL(5,2),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CHECK-IN
-- ============================================

CREATE TABLE checkin (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  energia INTEGER CHECK (energia BETWEEN 1 AND 5),
  sonno INTEGER CHECK (sonno BETWEEN 1 AND 5),
  stress INTEGER CHECK (stress BETWEEN 1 AND 5),
  motivazione INTEGER CHECK (motivazione BETWEEN 1 AND 5),
  note TEXT,
  UNIQUE(cliente_id, data)
);

-- ============================================
-- MESSAGGI
-- ============================================

CREATE TABLE messaggi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mittente_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  destinatario_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  testo TEXT NOT NULL,
  letto BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE schede ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheda_giorni ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheda_esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE assegnazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_serie ENABLE ROW LEVEL SECURITY;
ALTER TABLE misurazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaggi ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES — PROFILES
-- ============================================

-- Ogni utente vede e modifica solo il suo profilo
CREATE POLICY "Profilo personale" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Il coach vede i profili dei suoi clienti
CREATE POLICY "Coach vede i suoi clienti" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clienti
      WHERE coach_id = auth.uid() AND cliente_id = profiles.id
    )
  );

-- ============================================
-- POLICIES — COACH_CLIENTI
-- ============================================

CREATE POLICY "Coach gestisce i suoi clienti" ON coach_clienti
  FOR ALL USING (coach_id = auth.uid());

CREATE POLICY "Cliente vede il suo coach" ON coach_clienti
  FOR SELECT USING (cliente_id = auth.uid());

-- ============================================
-- POLICIES — ESERCIZI
-- ============================================

CREATE POLICY "Coach gestisce i suoi esercizi" ON esercizi
  FOR ALL USING (coach_id = auth.uid());

-- Il cliente vede gli esercizi del suo coach
CREATE POLICY "Cliente vede esercizi del coach" ON esercizi
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clienti
      WHERE cliente_id = auth.uid() AND coach_id = esercizi.coach_id
    )
  );

-- ============================================
-- POLICIES — SCHEDE
-- ============================================

CREATE POLICY "Coach gestisce le sue schede" ON schede
  FOR ALL USING (coach_id = auth.uid());

CREATE POLICY "Cliente vede le sue schede assegnate" ON schede
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assegnazioni
      WHERE cliente_id = auth.uid() AND scheda_id = schede.id
    )
  );

-- ============================================
-- POLICIES — SCHEDA_GIORNI
-- ============================================

CREATE POLICY "Coach gestisce i giorni delle sue schede" ON scheda_giorni
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM schede
      WHERE id = scheda_giorni.scheda_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Cliente vede i giorni delle sue schede" ON scheda_giorni
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM schede
      JOIN assegnazioni ON assegnazioni.scheda_id = schede.id
      WHERE schede.id = scheda_giorni.scheda_id
      AND assegnazioni.cliente_id = auth.uid()
    )
  );

-- ============================================
-- POLICIES — SCHEDA_ESERCIZI
-- ============================================

CREATE POLICY "Coach gestisce esercizi nelle schede" ON scheda_esercizi
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM scheda_giorni
      JOIN schede ON schede.id = scheda_giorni.scheda_id
      WHERE scheda_giorni.id = scheda_esercizi.giorno_id
      AND schede.coach_id = auth.uid()
    )
  );

CREATE POLICY "Cliente vede esercizi nelle sue schede" ON scheda_esercizi
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scheda_giorni
      JOIN schede ON schede.id = scheda_giorni.scheda_id
      JOIN assegnazioni ON assegnazioni.scheda_id = schede.id
      WHERE scheda_giorni.id = scheda_esercizi.giorno_id
      AND assegnazioni.cliente_id = auth.uid()
    )
  );

-- ============================================
-- POLICIES — ASSEGNAZIONI
-- ============================================

CREATE POLICY "Coach gestisce le sue assegnazioni" ON assegnazioni
  FOR ALL USING (coach_id = auth.uid());

CREATE POLICY "Cliente vede le sue assegnazioni" ON assegnazioni
  FOR SELECT USING (cliente_id = auth.uid());

-- ============================================
-- POLICIES — SESSIONI
-- ============================================

CREATE POLICY "Cliente gestisce le sue sessioni" ON sessioni
  FOR ALL USING (cliente_id = auth.uid());

CREATE POLICY "Coach vede le sessioni dei suoi clienti" ON sessioni
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clienti
      WHERE coach_id = auth.uid() AND cliente_id = sessioni.cliente_id
    )
  );

-- ============================================
-- POLICIES — LOG_SERIE
-- ============================================

CREATE POLICY "Cliente gestisce i suoi log" ON log_serie
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessioni
      WHERE id = log_serie.sessione_id AND cliente_id = auth.uid()
    )
  );

CREATE POLICY "Coach vede i log dei suoi clienti" ON log_serie
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessioni
      JOIN coach_clienti ON coach_clienti.cliente_id = sessioni.cliente_id
      WHERE sessioni.id = log_serie.sessione_id
      AND coach_clienti.coach_id = auth.uid()
    )
  );

-- ============================================
-- POLICIES — MISURAZIONI
-- ============================================

CREATE POLICY "Cliente gestisce le sue misurazioni" ON misurazioni
  FOR ALL USING (cliente_id = auth.uid());

CREATE POLICY "Coach vede le misurazioni dei suoi clienti" ON misurazioni
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clienti
      WHERE coach_id = auth.uid() AND cliente_id = misurazioni.cliente_id
    )
  );

-- ============================================
-- POLICIES — CHECKIN
-- ============================================

CREATE POLICY "Cliente gestisce i suoi checkin" ON checkin
  FOR ALL USING (cliente_id = auth.uid());

CREATE POLICY "Coach vede i checkin dei suoi clienti" ON checkin
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clienti
      WHERE coach_id = auth.uid() AND cliente_id = checkin.cliente_id
    )
  );

-- ============================================
-- POLICIES — MESSAGGI
-- ============================================

CREATE POLICY "Utente vede i suoi messaggi" ON messaggi
  FOR SELECT USING (
    auth.uid() = mittente_id OR auth.uid() = destinatario_id
  );

CREATE POLICY "Utente invia messaggi" ON messaggi
  FOR INSERT WITH CHECK (auth.uid() = mittente_id);

CREATE POLICY "Utente aggiorna i messaggi ricevuti" ON messaggi
  FOR UPDATE USING (auth.uid() = destinatario_id);

-- ============================================
-- TRIGGER — CREA PROFILO AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'role')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();