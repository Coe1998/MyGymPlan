-- User preferences for share card settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  share_card_variant TEXT DEFAULT 'glass'
    CHECK (share_card_variant IN ('editorial', 'brutalist', 'glass', 'ring')),
  share_card_theme TEXT DEFAULT 'dark'
    CHECK (share_card_theme IN ('dark', 'light')),
  share_card_include_coach BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON user_preferences FOR ALL
  USING (user_id = auth.uid());
