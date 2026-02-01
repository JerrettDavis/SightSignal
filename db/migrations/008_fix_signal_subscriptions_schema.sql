-- ============================================================================
-- Fix signal_subscriptions schema mismatch
-- Production has old schema from 004, new schema from 007 expects different columns
-- ============================================================================

-- Drop the old signal_subscriptions table if it exists with old schema
DROP TABLE IF EXISTS signal_subscriptions CASCADE;

-- Recreate with correct schema from migration 007
CREATE TABLE signal_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notification_enabled BOOLEAN DEFAULT TRUE,
  
  UNIQUE(user_id, signal_id)
);

CREATE INDEX IF NOT EXISTS idx_signal_subscriptions_user ON signal_subscriptions(user_id, subscribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_subscriptions_signal ON signal_subscriptions(signal_id);

-- Also create signal_sightings junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS signal_sightings (
  id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  sighting_id TEXT NOT NULL REFERENCES sightings(id) ON DELETE CASCADE,
  
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by TEXT REFERENCES users(id),
  is_pinned BOOLEAN DEFAULT FALSE,
  pin_order INTEGER,
  
  UNIQUE(signal_id, sighting_id)
);

CREATE INDEX IF NOT EXISTS idx_signal_sightings_signal ON signal_sightings(signal_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_sightings_sighting ON signal_sightings(sighting_id);
CREATE INDEX IF NOT EXISTS idx_signal_sightings_pinned ON signal_sightings(signal_id, is_pinned, pin_order) WHERE is_pinned = TRUE;

-- Triggers for maintaining counts
CREATE OR REPLACE FUNCTION update_signal_sighting_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE signals 
    SET sighting_count = sighting_count + 1,
        last_activity_at = NOW()
    WHERE id = NEW.signal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE signals 
    SET sighting_count = GREATEST(sighting_count - 1, 0)
    WHERE id = OLD.signal_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_signal_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE signals 
    SET subscriber_count = subscriber_count + 1
    WHERE id = NEW.signal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE signals 
    SET subscriber_count = GREATEST(subscriber_count - 1, 0)
    WHERE id = OLD.signal_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_signal_sighting_count ON signal_sightings;
CREATE TRIGGER trg_signal_sighting_count
  AFTER INSERT OR DELETE ON signal_sightings
  FOR EACH ROW EXECUTE FUNCTION update_signal_sighting_count();

DROP TRIGGER IF EXISTS trg_signal_subscriber_count ON signal_subscriptions;
CREATE TRIGGER trg_signal_subscriber_count
  AFTER INSERT OR DELETE ON signal_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_signal_subscriber_count();

-- Ensure signals table has required columns
ALTER TABLE signals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS sighting_count INTEGER DEFAULT 0;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS subscriber_count INTEGER DEFAULT 0;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Create default "All Sightings" signal if it doesn't exist
DO $$
DECLARE
  system_user_id TEXT;
BEGIN
  -- Try to find a system user or first user
  SELECT id INTO system_user_id FROM users LIMIT 1;
  
  IF system_user_id IS NOT NULL THEN
    INSERT INTO signals (
      id,
      name,
      description,
      owner_id,
      is_public,
      category_id,
      icon
    )
    VALUES (
      'signal-all',
      'All Sightings',
      'A feed of all sightings across all categories and locations',
      system_user_id,
      TRUE,
      NULL,
      '🌐'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Add all existing sightings to the "All Sightings" signal
    INSERT INTO signal_sightings (id, signal_id, sighting_id, added_at)
    SELECT 
      'ss-all-' || s.id,
      'signal-all',
      s.id,
      s.created_at
    FROM sightings s
    WHERE NOT EXISTS (
      SELECT 1 FROM signal_sightings ss 
      WHERE ss.signal_id = 'signal-all' AND ss.sighting_id = s.id
    );
  END IF;
END $$;
