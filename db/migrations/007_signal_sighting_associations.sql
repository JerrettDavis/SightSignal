-- Migration 007: Signal-Sighting Associations & Enhancements
-- 
-- Enables signal-as-subreddit model where:
-- - Sightings can belong to multiple signals (like appearing in multiple subreddits)
-- - All signals viewing a sighting see the same comments (prevent brigading)
-- - Signals can be organized around geofences (regional communities)

-- ============================================================================
-- Junction table: Many-to-many relationship between signals and sightings
-- ============================================================================

CREATE TABLE IF NOT EXISTS signal_sightings (
  id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  sighting_id TEXT NOT NULL REFERENCES sightings(id) ON DELETE CASCADE,
  
  -- Metadata
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by TEXT REFERENCES users(id),
  
  -- Ordering/pinning (like pinned posts in subreddits)
  is_pinned BOOLEAN DEFAULT FALSE,
  pin_order INTEGER,
  
  -- Prevent duplicates
  UNIQUE(signal_id, sighting_id)
);

-- Indexes for performance
CREATE INDEX idx_signal_sightings_signal ON signal_sightings(signal_id, added_at DESC);
CREATE INDEX idx_signal_sightings_sighting ON signal_sightings(sighting_id);
CREATE INDEX idx_signal_sightings_pinned ON signal_sightings(signal_id, is_pinned, pin_order) 
  WHERE is_pinned = TRUE;

-- ============================================================================
-- Enhance signals table with subreddit-like features
-- ============================================================================

-- Engagement metrics
ALTER TABLE signals ADD COLUMN IF NOT EXISTS subscriber_count INTEGER DEFAULT 0;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS sighting_count INTEGER DEFAULT 0;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Visibility and discovery
ALTER TABLE signals ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE signals ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS banner_image TEXT;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS description TEXT;

-- Moderation
ALTER TABLE signals ADD COLUMN IF NOT EXISTS moderator_ids TEXT[];
ALTER TABLE signals ADD COLUMN IF NOT EXISTS rules TEXT[];

-- Constraints
ALTER TABLE signals ADD CONSTRAINT signals_visibility_check 
  CHECK (visibility IN ('public', 'private', 'unlisted'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signals_visibility ON signals(visibility);
CREATE INDEX IF NOT EXISTS idx_signals_subscriber_count ON signals(subscriber_count DESC);
CREATE INDEX IF NOT EXISTS idx_signals_last_activity ON signals(last_activity_at DESC);

-- ============================================================================
-- User signal subscriptions (like subreddit subscriptions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS signal_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notification_enabled BOOLEAN DEFAULT TRUE,
  
  UNIQUE(user_id, signal_id)
);

CREATE INDEX IF NOT EXISTS idx_signal_subscriptions_user ON signal_subscriptions(user_id, subscribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_subscriptions_signal ON signal_subscriptions(signal_id);

-- ============================================================================
-- Update existing sightings to automatically be in "All Sightings" feed
-- ============================================================================

-- Create a default "All Sightings" signal if it doesn't exist
-- Note: Signals require owner_id, using system user or first admin
DO $$
DECLARE
  system_user_id TEXT;
BEGIN
  -- Get first user (or create system user if needed)
  SELECT id INTO system_user_id FROM users LIMIT 1;
  
  IF system_user_id IS NULL THEN
    -- No users exist, skip creating default signal
    RAISE NOTICE 'No users found, skipping default signal creation';
  ELSE
    INSERT INTO signals (
      id, 
      name, 
      description, 
      owner_id, 
      target, 
      triggers, 
      conditions, 
      visibility, 
      icon, 
      created_at, 
      updated_at
    )
    VALUES (
      'signal-all',
      'All Sightings',
      'Global feed of all sightings (like /r/all)',
      system_user_id,
      '{"type": "all"}'::jsonb,
      ARRAY[]::TEXT[],
      '{}'::jsonb,
      'public',
      '🌍',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Associate all existing sightings with the "All Sightings" signal
INSERT INTO signal_sightings (id, signal_id, sighting_id, added_at)
SELECT 
  'ss-' || sightings.id || '-all',
  'signal-all',
  sightings.id,
  sightings.created_at
FROM sightings
WHERE NOT EXISTS (
  SELECT 1 FROM signal_sightings 
  WHERE signal_id = 'signal-all' AND sighting_id = sightings.id
);

-- Update sighting count for "All Sightings"
UPDATE signals 
SET sighting_count = (SELECT COUNT(*) FROM signal_sightings WHERE signal_id = 'signal-all')
WHERE id = 'signal-all';

-- ============================================================================
-- Triggers to maintain counts
-- ============================================================================

-- Update signal sighting count when sightings are added/removed
CREATE OR REPLACE FUNCTION update_signal_sighting_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE signals 
    SET 
      sighting_count = sighting_count + 1,
      last_activity_at = NEW.added_at
    WHERE id = NEW.signal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE signals 
    SET sighting_count = GREATEST(0, sighting_count - 1)
    WHERE id = OLD.signal_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_signal_sighting_count
AFTER INSERT OR DELETE ON signal_sightings
FOR EACH ROW
EXECUTE FUNCTION update_signal_sighting_count();

-- Update signal subscriber count when subscriptions change
CREATE OR REPLACE FUNCTION update_signal_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE signals 
    SET subscriber_count = subscriber_count + 1
    WHERE id = NEW.signal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE signals 
    SET subscriber_count = GREATEST(0, subscriber_count - 1)
    WHERE id = OLD.signal_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_signal_subscriber_count
AFTER INSERT OR DELETE ON signal_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_signal_subscriber_count();

-- ============================================================================
-- Views for common queries
-- ============================================================================

-- Signal with engagement metrics
CREATE OR REPLACE VIEW signal_details AS
SELECT 
  s.*,
  COUNT(DISTINCT ss.sighting_id) as actual_sighting_count,
  COUNT(DISTINCT sub.user_id) as actual_subscriber_count
FROM signals s
LEFT JOIN signal_sightings ss ON s.id = ss.signal_id
LEFT JOIN signal_subscriptions sub ON s.id = sub.signal_id
GROUP BY s.id;

-- Sightings with their signals  
CREATE OR REPLACE VIEW sighting_signals AS
SELECT 
  si.id as sighting_id,
  si.description as sighting_title,
  si.created_at as sighting_created_at,
  s.id as signal_id,
  s.name as signal_name,
  s.icon as signal_icon,
  ss.is_pinned,
  ss.pin_order,
  ss.added_at
FROM sightings si
JOIN signal_sightings ss ON si.id = ss.sighting_id
JOIN signals s ON ss.signal_id = s.id;

-- Comment explaining the model
COMMENT ON TABLE signal_sightings IS 'Junction table enabling sightings to appear in multiple signals (like subreddits) with shared comments';
COMMENT ON TABLE signal_subscriptions IS 'User subscriptions to signals (like subreddit subscriptions)';
COMMENT ON COLUMN signals.subscriber_count IS 'Cached count of subscribers (maintained by trigger)';
COMMENT ON COLUMN signals.sighting_count IS 'Cached count of sightings (maintained by trigger)';
