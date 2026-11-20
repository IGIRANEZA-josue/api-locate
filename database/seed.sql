-- ============================================================================
-- API LOCATE - DEVELOPMENT SEED SQL (OPTIONAL)
-- NOTE: For complete development seeding with freshly generated bcrypt hashes,
-- sample endpoints, reviews, collections, and campaigns, run:
--   cd backend && npm run db:seed
--
-- All seeded API records set `is_seed_data = 1` so development seed listings
-- are always clearly distinguished from real production listings.
-- ============================================================================

USE `api_locate`;

-- Starter tags for developer API discovery
INSERT INTO `tags` (`name`, `slug`) VALUES
  ('rest', 'rest'),
  ('graphql', 'graphql'),
  ('openapi', 'openapi'),
  ('webhooks', 'webhooks'),
  ('oauth2', 'oauth2'),
  ('jwt', 'jwt'),
  ('payments', 'payments'),
  ('mobile-money', 'mobile-money'),
  ('llm', 'llm'),
  ('embeddings', 'embeddings'),
  ('weather', 'weather'),
  ('free-api', 'free-api'),
  ('sms', 'sms'),
  ('email', 'email'),
  ('geocoding', 'geocoding')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
