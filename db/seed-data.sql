-- SignalFeed Seed Data
-- This file populates the database with realistic test data

-- IMPORTANT: Run migrations first before running this seed!

-- ============================================================================
-- USERS
-- ============================================================================
INSERT INTO users (id, email, username, role, status, created_at, updated_at)
VALUES
  ('user-001', 'admin@signalfeed.app', 'admin', 'admin', 'active', NOW(), NOW()),
  ('user-002', 'moderator@signalfeed.app', 'moderator', 'moderator', 'active', NOW(), NOW()),
  ('user-003', 'reporter1@signalfeed.app', 'reporter1', 'user', 'active', NOW(), NOW()),
  ('user-004', 'reporter2@signalfeed.app', 'reporter2', 'user', 'active', NOW(), NOW()),
  ('user-005', 'reporter3@signalfeed.app', 'reporter3', 'user', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- GEOFENCES
-- ============================================================================
INSERT INTO geofences (id, name, visibility, owner_id, polygon, created_at)
VALUES
  ('geofence-001', 'Downtown District', 'public', 'user-001', 
   '{"type":"Polygon","coordinates":[[[-122.4195,37.7749],[-122.4095,37.7749],[-122.4095,37.7849],[-122.4195,37.7849],[-122.4195,37.7749]]]}', 
   NOW()),
  ('geofence-002', 'Harbor Area', 'public', 'user-001',
   '{"type":"Polygon","coordinates":[[[-122.3995,37.7749],[-122.3895,37.7749],[-122.3895,37.7849],[-122.3995,37.7849],[-122.3995,37.7749]]]}',
   NOW()),
  ('geofence-003', 'University Campus', 'public', 'user-001',
   '{"type":"Polygon","coordinates":[[[-122.4295,37.7649],[-122.4195,37.7649],[-122.4195,37.7749],[-122.4295,37.7749],[-122.4295,37.7649]]]}',
   NOW()),
  ('geofence-004', 'Airport Vicinity', 'public', 'user-001',
   '{"type":"Polygon","coordinates":[[[-122.3795,37.6189],[-122.3695,37.6189],[-122.3695,37.6289],[-122.3795,37.6289],[-122.3795,37.6189]]]}',
   NOW()),
  ('geofence-005', 'Industrial Zone', 'public', 'user-002',
   '{"type":"Polygon","coordinates":[[[-122.4495,37.7549],[-122.4395,37.7549],[-122.4395,37.7649],[-122.4495,37.7649],[-122.4495,37.7549]]]}',
   NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TAXONOMY (CATEGORIES & TYPES)
-- ============================================================================
INSERT INTO categories (id, label, description)
VALUES
  ('cat-emergency', 'Emergency', 'Emergency situations requiring immediate attention'),
  ('cat-traffic', 'Traffic & Transport', 'Road conditions, accidents, and transit issues'),
  ('cat-community', 'Community Events', 'Local events, gatherings, and activities'),
  ('cat-wildlife', 'Wildlife & Nature', 'Animal sightings and nature observations'),
  ('cat-infrastructure', 'Infrastructure', 'Utilities, construction, and public works')
ON CONFLICT (id) DO NOTHING;

-- Need subcategories for sighting_types to reference
INSERT INTO subcategories (id, label, category_id)
VALUES
  ('subcat-emergency', 'Emergency', 'cat-emergency'),
  ('subcat-traffic', 'Traffic', 'cat-traffic'),
  ('subcat-community', 'Community', 'cat-community'),
  ('subcat-wildlife', 'Wildlife', 'cat-wildlife'),
  ('subcat-infrastructure', 'Infrastructure', 'cat-infrastructure')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sighting_types (id, category_id, subcategory_id, label, icon)
VALUES
  ('type-fire', 'cat-emergency', 'subcat-emergency', 'Fire', '🔥'),
  ('type-medical', 'cat-emergency', 'subcat-emergency', 'Medical Emergency', '🚑'),
  ('type-accident', 'cat-traffic', 'subcat-traffic', 'Traffic Accident', '💥'),
  ('type-closure', 'cat-traffic', 'subcat-traffic', 'Road Closure', '🚧'),
  ('type-festival', 'cat-community', 'subcat-community', 'Festival', '🎪'),
  ('type-market', 'cat-community', 'subcat-community', 'Market', '🛍️'),
  ('type-wildlife', 'cat-wildlife', 'subcat-wildlife', 'Wildlife Sighting', '🦌'),
  ('type-rare-bird', 'cat-wildlife', 'subcat-wildlife', 'Rare Bird', '🦅'),
  ('type-construction', 'cat-infrastructure', 'subcat-infrastructure', 'Construction', '🏗️'),
  ('type-power-outage', 'cat-infrastructure', 'subcat-infrastructure', 'Power Outage', '⚡')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SIGHTINGS
-- ============================================================================
INSERT INTO sightings (id, reporter_id, type_id, category_id, description, location, status, importance, score, observed_at, created_at, fields)
VALUES
  -- Downtown emergencies
  ('sight-001', 'user-003', 'type-fire', 'cat-emergency', 'Large fire at commercial building on Main St', 
   '{"lat":37.7799,"lng":-122.4149}', 'active', 'high', 95, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', '{}'),
  
  -- Harbor area events  
  ('sight-002', 'user-004', 'type-market', 'cat-community', 'Weekly farmers market at waterfront',
   '{"lat":37.7799,"lng":-122.3945}', 'active', 'low', 85, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours', '{}'),
  ('sight-003', 'user-005', 'type-wildlife', 'cat-wildlife', 'Large group of seals near pier',
   '{"lat":37.7815,"lng":-122.3920}', 'active', 'low', 75, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', '{}'),
  
  -- Traffic incidents
  ('sight-004', 'user-003', 'type-accident', 'cat-traffic', 'Three vehicle collision causing delays',
   '{"lat":37.7699,"lng":-122.4195}', 'active', 'high', 88, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', '{}'),
  ('sight-005', 'user-004', 'type-closure', 'cat-traffic', 'Bridge closed for emergency repairs',
   '{"lat":37.7799,"lng":-122.3945}', 'active', 'high', 90, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours', '{}'),
  
  -- Campus activities
  ('sight-006', 'user-005', 'type-festival', 'cat-community', 'Annual campus open house event',
   '{"lat":37.7699,"lng":-122.4245}', 'active', 'low', 78, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours', '{}'),
  
  -- Airport area
  ('sight-007', 'user-003', 'type-rare-bird', 'cat-wildlife', 'Bald eagle spotted near runway',
   '{"lat":37.6239,"lng":-122.3745}', 'active', 'low', 70, NOW() - INTERVAL '7 hours', NOW() - INTERVAL '7 hours', '{}'),
  
  -- Industrial zone
  ('sight-008', 'user-004', 'type-power-outage', 'cat-infrastructure', 'Widespread power outage affecting area',
   '{"lat":37.7599,"lng":-122.4445}', 'active', 'high', 92, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', '{}'),
  ('sight-009', 'user-005', 'type-construction', 'cat-infrastructure', 'Large scale construction project',
   '{"lat":37.7575,"lng":-122.4420}', 'active', 'low', 65, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours', '{}'),
  
  -- Additional downtown events
  ('sight-010', 'user-003', 'type-medical', 'cat-emergency', 'Ambulance requested at public plaza',
   '{"lat":37.7789,"lng":-122.4165}', 'active', 'high', 98, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', '{}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SIGNALS
-- ============================================================================

-- "All Sightings" - Global signal that matches everything
INSERT INTO signals (id, name, description, target, conditions, triggers, owner_id, is_active, created_at, updated_at)
VALUES
  ('signal-all', 'All Sightings', 'All sightings across all areas', 
   '{"kind":"global"}',
   '{}',
   ARRAY['new_sighting'],
   'user-001', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Downtown Emergency Signal
INSERT INTO signals (id, name, description, target, conditions, triggers, owner_id, is_active, created_at, updated_at)
VALUES
  ('signal-001', 'Downtown Emergencies', 'Critical events in downtown district',
   '{"kind":"geofence","geofenceId":"geofence-001"}',
   '{"categoryIds":["cat-emergency"],"importance":"high"}',
   ARRAY['new_sighting'],
   'user-001', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Harbor Area Activities
INSERT INTO signals (id, name, description, target, conditions, triggers, owner_id, is_active, created_at, updated_at)
VALUES
  ('signal-002', 'Harbor Area Activities', 'Events and sightings at waterfront',
   '{"kind":"geofence","geofenceId":"geofence-002"}',
   '{}',
   ARRAY['new_sighting'],
   'user-001', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Campus Events Signal
INSERT INTO signals (id, name, description, target, conditions, triggers, owner_id, is_active, created_at, updated_at)
VALUES
  ('signal-003', 'Campus Events', 'University campus activities',
   '{"kind":"geofence","geofenceId":"geofence-003"}',
   '{"categoryIds":["cat-community"]}',
   ARRAY['new_sighting'],
   'user-001', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Traffic Alerts Signal
INSERT INTO signals (id, name, description, target, conditions, triggers, owner_id, is_active, created_at, updated_at)
VALUES
  ('signal-004', 'Traffic Alerts', 'Traffic incidents and road closures',
   '{"kind":"global"}',
   '{"categoryIds":["cat-traffic"],"importance":"high"}',
   ARRAY['new_sighting'],
   'user-002', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Wildlife Watchers Signal
INSERT INTO signals (id, name, description, target, conditions, triggers, owner_id, is_active, created_at, updated_at)
VALUES
  ('signal-005', 'Wildlife Watchers', 'Interesting animal sightings',
   '{"kind":"global"}',
   '{"categoryIds":["cat-wildlife"]}',
   ARRAY['new_sighting'],
   'user-002', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Critical Infrastructure Issues
INSERT INTO signals (id, name, description, target, conditions, triggers, owner_id, is_active, created_at, updated_at)
VALUES
  ('signal-006', 'Infrastructure Alerts', 'Power, water, and critical infrastructure',
   '{"kind":"global"}',
   '{"categoryIds":["cat-infrastructure"],"importance":"high"}',
   ARRAY['new_sighting'],
   'user-001', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SIGNAL-SIGHTING ASSOCIATIONS
-- ============================================================================

-- All Sightings signal gets ALL sightings
INSERT INTO signal_sightings (id, signal_id, sighting_id, added_at)
SELECT 'ss-all-' || id, 'signal-all', id, created_at 
FROM sightings
ON CONFLICT (signal_id, sighting_id) DO NOTHING;

-- Downtown Emergencies (geofence-001 + emergency + high)
INSERT INTO signal_sightings (id, signal_id, sighting_id, added_at)
VALUES
  ('ss-001-001', 'signal-001', 'sight-001', NOW()),  -- Fire in downtown
  ('ss-001-010', 'signal-001', 'sight-010', NOW())   -- Medical emergency in downtown
ON CONFLICT (signal_id, sighting_id) DO NOTHING;

-- Harbor Area Activities (geofence-002 + any)
INSERT INTO signal_sightings (id, signal_id, sighting_id, added_at)
VALUES
  ('ss-002-002', 'signal-002', 'sight-002', NOW()),  -- Farmers market
  ('ss-002-003', 'signal-002', 'sight-003', NOW()),  -- Seal colony
  ('ss-002-005', 'signal-002', 'sight-005', NOW())   -- Bridge maintenance
ON CONFLICT (signal_id, sighting_id) DO NOTHING;

-- Campus Events (geofence-003 + community)
INSERT INTO signal_sightings (id, signal_id, sighting_id, added_at)
VALUES
  ('ss-003-006', 'signal-003', 'sight-006', NOW())   -- University open house
ON CONFLICT (signal_id, sighting_id) DO NOTHING;

-- Traffic Alerts (global + traffic + high importance)
INSERT INTO signal_sightings (id, signal_id, sighting_id, added_at)
VALUES
  ('ss-004-004', 'signal-004', 'sight-004', NOW()),  -- Multi-car accident
  ('ss-004-005', 'signal-004', 'sight-005', NOW())   -- Bridge closure
ON CONFLICT (signal_id, sighting_id) DO NOTHING;

-- Wildlife Watchers (global + wildlife category)
INSERT INTO signal_sightings (id, signal_id, sighting_id, added_at)
VALUES
  ('ss-005-003', 'signal-005', 'sight-003', NOW()),  -- Seal colony
  ('ss-005-007', 'signal-005', 'sight-007', NOW())   -- Rare eagle
ON CONFLICT (signal_id, sighting_id) DO NOTHING;

-- Infrastructure Alerts (global + infrastructure + high)
INSERT INTO signal_sightings (id, signal_id, sighting_id, added_at)
VALUES
  ('ss-006-008', 'signal-006', 'sight-008', NOW())   -- Power outage
ON CONFLICT (signal_id, sighting_id) DO NOTHING;

-- ============================================================================
-- SIGNAL SUBSCRIPTIONS
-- ============================================================================
INSERT INTO signal_subscriptions (id, signal_id, user_id, subscribed_at, notification_enabled)
VALUES
  ('sub-001', 'signal-001', 'user-003', NOW(), true),
  ('sub-002', 'signal-002', 'user-004', NOW(), true),
  ('sub-003', 'signal-004', 'user-005', NOW(), true)
ON CONFLICT (id) DO NOTHING;

-- Final summary
DO $$
BEGIN
  RAISE NOTICE '✅ Seed data loaded successfully!';
  RAISE NOTICE '   Users: %', (SELECT COUNT(*) FROM users);
  RAISE NOTICE '   Geofences: %', (SELECT COUNT(*) FROM geofences);
  RAISE NOTICE '   Categories: %', (SELECT COUNT(*) FROM categories);
  RAISE NOTICE '   Sighting Types: %', (SELECT COUNT(*) FROM sighting_types);
  RAISE NOTICE '   Sightings: %', (SELECT COUNT(*) FROM sightings);
  RAISE NOTICE '   Signals: %', (SELECT COUNT(*) FROM signals);
  RAISE NOTICE '   Signal-Sighting Associations: %', (SELECT COUNT(*) FROM signal_sightings);
  RAISE NOTICE '   Subscriptions: %', (SELECT COUNT(*) FROM signal_subscriptions);
END $$;
