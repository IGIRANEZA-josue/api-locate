-- ============================================================================
-- API LOCATE - COMPLETE MYSQL DATABASE SCHEMA
-- Slogan: Discover APIs. Organize Resources. Build More.
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `api_locate`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `api_locate`;

SET NAMES utf8mb4;

-- ============================================================================
-- 1. users
-- ============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(60) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(120) NULL DEFAULT NULL,
  `avatar_url` VARCHAR(500) NULL DEFAULT NULL,
  `bio` TEXT NULL,
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `theme_preference` ENUM('light', 'dark', 'system') NOT NULL DEFAULT 'system',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. provider_profiles (depends on: users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `provider_profiles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `company_name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(170) NOT NULL,
  `logo_url` VARCHAR(500) NULL DEFAULT NULL,
  `website_url` VARCHAR(500) NULL DEFAULT NULL,
  `contact_email` VARCHAR(190) NULL DEFAULT NULL,
  `description` TEXT NULL,
  `verification_status` ENUM('unverified', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'unverified',
  `verified_at` DATETIME NULL DEFAULT NULL,
  `verified_by` BIGINT UNSIGNED NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_provider_profiles_user` (`user_id`),
  UNIQUE KEY `uq_provider_profiles_slug` (`slug`),
  KEY `idx_provider_profiles_verification` (`verification_status`),
  KEY `idx_provider_profiles_verified_by` (`verified_by`),
  CONSTRAINT `fk_provider_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_provider_profiles_verified_by`
    FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS `categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `icon` VARCHAR(80) NULL DEFAULT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_name` (`name`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_active_order` (`is_active`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. tags
-- ============================================================================
CREATE TABLE IF NOT EXISTS `tags` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(80) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tags_name` (`name`),
  UNIQUE KEY `uq_tags_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. api_sources
-- ============================================================================
CREATE TABLE IF NOT EXISTS `api_sources` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(170) NOT NULL,
  `source_type` ENUM('official_feed', 'openapi_directory', 'github_repo', 'public_catalog') NOT NULL DEFAULT 'openapi_directory',
  `base_url` VARCHAR(500) NOT NULL,
  `feed_url` VARCHAR(500) NOT NULL,
  `license_name` VARCHAR(120) NULL DEFAULT NULL,
  `license_url` VARCHAR(500) NULL DEFAULT NULL,
  `attribution_text` VARCHAR(500) NULL DEFAULT NULL,
  `terms_url` VARCHAR(500) NULL DEFAULT NULL,
  `rate_limit_per_hour` INT UNSIGNED NOT NULL DEFAULT 60,
  `auto_publish` TINYINT(1) NOT NULL DEFAULT 0,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `config_json` JSON NULL,
  `last_imported_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_api_sources_slug` (`slug`),
  KEY `idx_api_sources_enabled` (`is_enabled`, `source_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. plans
-- ============================================================================
CREATE TABLE IF NOT EXISTS `plans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `price_monthly` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `billing_interval` ENUM('month', 'year', 'lifetime') NOT NULL DEFAULT 'month',
  `max_favorites` INT NULL DEFAULT NULL,
  `features_json` JSON NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_plans_code` (`code`),
  KEY `idx_plans_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. advertising_packages
-- ============================================================================
CREATE TABLE IF NOT EXISTS `advertising_packages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(60) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `placement_type` ENUM('featured', 'spotlight', 'homepage') NOT NULL,
  `description` TEXT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `duration_days` INT UNSIGNED NOT NULL,
  `features_json` JSON NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_advertising_packages_code` (`code`),
  KEY `idx_advertising_packages_active` (`is_active`, `placement_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. apis (depends on: categories, provider_profiles, users, api_sources)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `apis` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(180) NOT NULL,
  `slug` VARCHAR(190) NOT NULL,
  `logo_url` VARCHAR(500) NULL DEFAULT NULL,
  `short_description` VARCHAR(320) NOT NULL,
  `full_description` TEXT NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `provider_profile_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `provider_name` VARCHAR(150) NOT NULL,
  `submitted_by` BIGINT UNSIGNED NULL DEFAULT NULL,
  `owner_user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `base_url` VARCHAR(500) NULL DEFAULT NULL,
  `docs_url` VARCHAR(500) NOT NULL,
  `website_url` VARCHAR(500) NULL DEFAULT NULL,
  `auth_type` ENUM('none', 'api_key', 'oauth2', 'basic', 'bearer', 'custom', 'unknown') NOT NULL DEFAULT 'unknown',
  `auth_details` VARCHAR(300) NULL DEFAULT NULL,
  `pricing_model` ENUM('free', 'freemium', 'paid', 'contact', 'unknown') NOT NULL DEFAULT 'unknown',
  `pricing_details` VARCHAR(300) NULL DEFAULT NULL,
  `rate_limit_info` VARCHAR(255) NULL DEFAULT NULL,
  `https_supported` TINYINT(1) NOT NULL DEFAULT 1,
  `cors_supported` ENUM('yes', 'no', 'unknown') NOT NULL DEFAULT 'unknown',
  `openapi_spec_url` VARCHAR(500) NULL DEFAULT NULL,
  `source_type` ENUM('admin', 'community', 'imported') NOT NULL DEFAULT 'community',
  `source_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `external_source_key` VARCHAR(180) NULL DEFAULT NULL,
  `source_url` VARCHAR(500) NULL DEFAULT NULL,
  `license_name` VARCHAR(120) NULL DEFAULT NULL,
  `license_url` VARCHAR(500) NULL DEFAULT NULL,
  `attribution_note` VARCHAR(500) NULL DEFAULT NULL,
  `is_seed_data` TINYINT(1) NOT NULL DEFAULT 0,
  `verification_level` ENUM('verified', 'community_reviewed', 'unverified', 'incomplete') NOT NULL DEFAULT 'unverified',
  `operational_status` ENUM('operational', 'degraded', 'down', 'deprecated', 'unknown') NOT NULL DEFAULT 'operational',
  `last_checked_at` DATETIME NULL DEFAULT NULL,
  `last_response_ms` INT UNSIGNED NULL DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'archived') NOT NULL DEFAULT 'pending',
  `rejection_reason` TEXT NULL,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `views_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `favorites_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `reviews_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `average_rating` DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
  `features_json` JSON NULL,
  `published_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_apis_slug` (`slug`),
  UNIQUE KEY `uq_apis_source_identity` (`source_id`, `external_source_key`),
  KEY `idx_apis_name` (`name`),
  KEY `idx_apis_status` (`status`),
  KEY `idx_apis_category` (`category_id`),
  KEY `idx_apis_pricing` (`pricing_model`),
  KEY `idx_apis_auth` (`auth_type`),
  KEY `idx_apis_provider_profile` (`provider_profile_id`),
  KEY `idx_apis_provider_name` (`provider_name`),
  KEY `idx_apis_owner_user` (`owner_user_id`),
  KEY `idx_apis_submitted_by` (`submitted_by`),
  KEY `idx_apis_published` (`status`, `published_at`),
  KEY `idx_apis_reviews_rank` (`status`, `reviews_count`, `average_rating`),
  FULLTEXT KEY `ft_apis_discovery` (`name`, `short_description`, `full_description`, `provider_name`),
  CONSTRAINT `fk_apis_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_apis_provider_profile`
    FOREIGN KEY (`provider_profile_id`) REFERENCES `provider_profiles` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_apis_submitted_by`
    FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_apis_owner_user`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_apis_source`
    FOREIGN KEY (`source_id`) REFERENCES `api_sources` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. api_tags (depends on: apis, tags)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `api_tags` (
  `api_id` BIGINT UNSIGNED NOT NULL,
  `tag_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`api_id`, `tag_id`),
  KEY `idx_api_tags_tag` (`tag_id`),
  CONSTRAINT `fk_api_tags_api`
    FOREIGN KEY (`api_id`) REFERENCES `apis` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_api_tags_tag`
    FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. api_endpoints (depends on: apis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `api_endpoints` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `api_id` BIGINT UNSIGNED NOT NULL,
  `http_method` ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'GRAPHQL', 'WS') NOT NULL DEFAULT 'GET',
  `path` VARCHAR(300) NOT NULL,
  `summary` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `auth_required` TINYINT(1) NOT NULL DEFAULT 1,
  `sample_request` TEXT NULL,
  `sample_response` TEXT NULL,
  `query_params_json` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_api_endpoints_api` (`api_id`),
  CONSTRAINT `fk_api_endpoints_api`
    FOREIGN KEY (`api_id`) REFERENCES `apis` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. favorites (depends on: users, apis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `favorites` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `api_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_favorites_user_api` (`user_id`, `api_id`),
  KEY `idx_favorites_api` (`api_id`),
  CONSTRAINT `fk_favorites_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_favorites_api`
    FOREIGN KEY (`api_id`) REFERENCES `apis` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. collections (depends on: users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `collections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(150) NOT NULL,
  `description` VARCHAR(500) NULL DEFAULT NULL,
  `is_public` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collections_user_slug` (`user_id`, `slug`),
  KEY `idx_collections_user` (`user_id`),
  CONSTRAINT `fk_collections_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 13. collection_apis (depends on: collections, apis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `collection_apis` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collection_id` BIGINT UNSIGNED NOT NULL,
  `api_id` BIGINT UNSIGNED NOT NULL,
  `notes` VARCHAR(300) NULL DEFAULT NULL,
  `added_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collection_apis_entry` (`collection_id`, `api_id`),
  KEY `idx_collection_apis_api` (`api_id`),
  CONSTRAINT `fk_collection_apis_collection`
    FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_collection_apis_api`
    FOREIGN KEY (`api_id`) REFERENCES `apis` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 14. subscriptions (depends on: users, plans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `plan_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('pending', 'active', 'past_due', 'canceled', 'expired', 'failed') NOT NULL DEFAULT 'pending',
  `payment_provider` VARCHAR(50) NOT NULL DEFAULT 'stripe',
  `external_subscription_id` VARCHAR(190) NULL DEFAULT NULL,
  `auto_renew` TINYINT(1) NOT NULL DEFAULT 1,
  `cancel_at_period_end` TINYINT(1) NOT NULL DEFAULT 0,
  `current_period_start` DATETIME NULL DEFAULT NULL,
  `current_period_end` DATETIME NULL DEFAULT NULL,
  `canceled_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subscriptions_user_status` (`user_id`, `status`),
  KEY `idx_subscriptions_plan` (`plan_id`),
  KEY `idx_subscriptions_billing_period` (`status`, `current_period_end`),
  CONSTRAINT `fk_subscriptions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_subscriptions_plan`
    FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. sponsored_campaigns (depends on: apis, advertising_packages, users, provider_profiles, categories)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `sponsored_campaigns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `api_id` BIGINT UNSIGNED NOT NULL,
  `package_id` BIGINT UNSIGNED NOT NULL,
  `advertiser_user_id` BIGINT UNSIGNED NOT NULL,
  `provider_profile_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `target_category_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `title` VARCHAR(160) NOT NULL,
  `headline` VARCHAR(240) NULL DEFAULT NULL,
  `cta_label` VARCHAR(60) NOT NULL DEFAULT 'Explore API',
  `payment_status` ENUM('unpaid', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'unpaid',
  `approval_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `campaign_status` ENUM('awaiting_payment', 'pending_review', 'scheduled', 'active', 'expired', 'rejected', 'canceled') NOT NULL DEFAULT 'awaiting_payment',
  `rejection_reason` TEXT NULL,
  `reviewed_by` BIGINT UNSIGNED NULL DEFAULT NULL,
  `reviewed_at` DATETIME NULL DEFAULT NULL,
  `starts_at` DATETIME NULL DEFAULT NULL,
  `ends_at` DATETIME NULL DEFAULT NULL,
  `impressions_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `clicks_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_campaigns_status_dates` (`campaign_status`, `approval_status`, `payment_status`, `starts_at`, `ends_at`),
  KEY `idx_campaigns_advertiser` (`advertiser_user_id`),
  KEY `idx_campaigns_api` (`api_id`),
  KEY `idx_campaigns_package` (`package_id`),
  KEY `idx_campaigns_target_category` (`target_category_id`),
  CONSTRAINT `fk_campaigns_api`
    FOREIGN KEY (`api_id`) REFERENCES `apis` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_campaigns_package`
    FOREIGN KEY (`package_id`) REFERENCES `advertising_packages` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_campaigns_advertiser`
    FOREIGN KEY (`advertiser_user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_campaigns_provider_profile`
    FOREIGN KEY (`provider_profile_id`) REFERENCES `provider_profiles` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_campaigns_target_category`
    FOREIGN KEY (`target_category_id`) REFERENCES `categories` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_campaigns_reviewed_by`
    FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 16. payments (depends on: users, subscriptions, sponsored_campaigns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `payment_for` ENUM('subscription', 'campaign') NOT NULL,
  `subscription_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `campaign_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `payment_reference` VARCHAR(120) NOT NULL,
  `provider` VARCHAR(50) NOT NULL DEFAULT 'stripe',
  `provider_session_id` VARCHAR(190) NULL DEFAULT NULL,
  `provider_transaction_id` VARCHAR(190) NULL DEFAULT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `status` ENUM('pending', 'succeeded', 'failed', 'refunded', 'canceled') NOT NULL DEFAULT 'pending',
  `failure_reason` VARCHAR(300) NULL DEFAULT NULL,
  `metadata_json` JSON NULL,
  `paid_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_reference` (`payment_reference`),
  KEY `idx_payments_user_created` (`user_id`, `created_at`),
  KEY `idx_payments_status` (`status`),
  KEY `idx_payments_subscription` (`subscription_id`),
  KEY `idx_payments_campaign` (`campaign_id`),
  CONSTRAINT `fk_payments_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_subscription`
    FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_campaign`
    FOREIGN KEY (`campaign_id`) REFERENCES `sponsored_campaigns` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 17. payment_events (depends on: payments) - idempotent webhook deduplication
-- ============================================================================
CREATE TABLE IF NOT EXISTS `payment_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider` VARCHAR(40) NOT NULL,
  `event_id` VARCHAR(140) NOT NULL,
  `event_type` VARCHAR(100) NOT NULL,
  `payment_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `signature_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `processing_status` ENUM('processed', 'ignored', 'failed') NOT NULL DEFAULT 'processed',
  `payload_json` JSON NULL,
  `processed_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_events_provider_event` (`provider`, `event_id`),
  KEY `idx_payment_events_payment` (`payment_id`),
  CONSTRAINT `fk_payment_events_payment`
    FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 18. api_moderation_logs (depends on: apis, users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `api_moderation_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `api_id` BIGINT UNSIGNED NOT NULL,
  `moderator_user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `action` ENUM('submitted', 'approved', 'rejected', 'edited', 'archived', 'imported', 'verified') NOT NULL,
  `previous_status` VARCHAR(40) NULL DEFAULT NULL,
  `new_status` VARCHAR(40) NULL DEFAULT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_moderation_logs_api` (`api_id`, `created_at`),
  KEY `idx_moderation_logs_moderator` (`moderator_user_id`),
  CONSTRAINT `fk_moderation_logs_api`
    FOREIGN KEY (`api_id`) REFERENCES `apis` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_moderation_logs_moderator`
    FOREIGN KEY (`moderator_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 19. api_reviews (depends on: apis, users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `api_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `api_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL,
  `title` VARCHAR(150) NULL DEFAULT NULL,
  `comment` TEXT NULL,
  `status` ENUM('visible', 'hidden', 'flagged') NOT NULL DEFAULT 'visible',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_api_reviews_api_user` (`api_id`, `user_id`),
  KEY `idx_api_reviews_api_status` (`api_id`, `status`, `created_at`),
  KEY `idx_api_reviews_user` (`user_id`),
  CONSTRAINT `fk_api_reviews_api`
    FOREIGN KEY (`api_id`) REFERENCES `apis` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_api_reviews_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 20. api_reports (depends on: apis, users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `api_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `api_id` BIGINT UNSIGNED NOT NULL,
  `reporter_user_id` BIGINT UNSIGNED NOT NULL,
  `reason` ENUM('broken_docs', 'incorrect_info', 'security_concern', 'duplicate_listing', 'other') NOT NULL,
  `details` TEXT NOT NULL,
  `status` ENUM('open', 'investigating', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
  `resolved_by` BIGINT UNSIGNED NULL DEFAULT NULL,
  `resolution_notes` TEXT NULL,
  `resolved_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_api_reports_status` (`status`, `created_at`),
  KEY `idx_api_reports_api` (`api_id`),
  KEY `idx_api_reports_reporter` (`reporter_user_id`),
  CONSTRAINT `fk_api_reports_api`
    FOREIGN KEY (`api_id`) REFERENCES `apis` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_api_reports_reporter`
    FOREIGN KEY (`reporter_user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_api_reports_resolved_by`
    FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 21. notifications (depends on: users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `type` VARCHAR(60) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `message` TEXT NOT NULL,
  `link_url` VARCHAR(300) NULL DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_status` (`user_id`, `is_read`, `created_at`),
  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 22. api_import_jobs (depends on: api_sources, users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `api_import_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `source_id` BIGINT UNSIGNED NOT NULL,
  `triggered_by` BIGINT UNSIGNED NULL DEFAULT NULL,
  `status` ENUM('running', 'completed', 'failed', 'partial') NOT NULL DEFAULT 'running',
  `total_fetched` INT UNSIGNED NOT NULL DEFAULT 0,
  `imported_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `skipped_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `failed_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `error_summary` TEXT NULL,
  `log_json` JSON NULL,
  `started_at` DATETIME NOT NULL,
  `finished_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_import_jobs_source_status` (`source_id`, `status`, `created_at`),
  CONSTRAINT `fk_import_jobs_source`
    FOREIGN KEY (`source_id`) REFERENCES `api_sources` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_import_jobs_triggered_by`
    FOREIGN KEY (`triggered_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 23. api_search_logs (depends on: users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `api_search_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `search_query` VARCHAR(190) NULL DEFAULT NULL,
  `filters_json` JSON NULL,
  `sort_by` VARCHAR(40) NULL DEFAULT NULL,
  `results_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_search_logs_created` (`created_at`),
  KEY `idx_search_logs_query` (`search_query`),
  CONSTRAINT `fk_search_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 24. sponsored_campaign_events (depends on: sponsored_campaigns, users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `sponsored_campaign_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `campaign_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `event_type` ENUM('impression', 'click') NOT NULL,
  `placement` VARCHAR(60) NULL DEFAULT NULL,
  `visitor_hash` VARCHAR(64) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_campaign_events_campaign_type` (`campaign_id`, `event_type`, `created_at`),
  CONSTRAINT `fk_campaign_events_campaign`
    FOREIGN KEY (`campaign_id`) REFERENCES `sponsored_campaigns` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_campaign_events_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STARTER SYSTEM CONFIGURATION (Categories, Plans, Advertising Packages, Sources)
-- ============================================================================

INSERT INTO `categories` (`name`, `slug`, `description`, `icon`, `display_order`, `is_active`)
VALUES
  ('Artificial Intelligence & ML', 'ai-machine-learning', 'Large language models, computer vision, speech synthesis, embeddings, and predictive ML services.', 'cpu', 1, 1),
  ('Payments & FinTech', 'payments-fintech', 'Global payment gateways, mobile money, invoicing, FX rates, banking rails, and billing APIs.', 'credit-card', 2, 1),
  ('Authentication & Security', 'authentication-security', 'OAuth 2.0, passkeys, MFA, fraud detection, email verification, and zero-trust identity APIs.', 'shield', 3, 1),
  ('Communication & Messaging', 'communication-messaging', 'Transactional email, SMS, WhatsApp, voice, push notifications, and real-time chat APIs.', 'message-square', 4, 1),
  ('Geolocation & Maps', 'geolocation-maps', 'Geocoding, routing, IP geolocation, satellite imagery, places search, and logistics mapping.', 'map-pin', 5, 1),
  ('Weather & Environment', 'weather-environment', 'Real-time weather forecasts, air quality, climate telemetry, solar radiation, and marine data.', 'cloud-sun', 6, 1),
  ('Cloud, DevOps & Infrastructure', 'cloud-devops', 'Serverless compute, DNS, CI/CD automation, container registries, monitoring, and edge storage.', 'server', 7, 1),
  ('Data, Search & Analytics', 'data-analytics', 'Full-text search engines, web scraping, financial market feeds, and business intelligence APIs.', 'bar-chart-2', 8, 1),
  ('Media, Video & Audio', 'media-video-audio', 'Image optimization, video transcoding, live streaming, OCR, and document generation APIs.', 'film', 9, 1),
  ('E-Commerce & Logistics', 'ecommerce-logistics', 'Shipping rates, parcel tracking, tax calculation, product catalogs, and headless commerce.', 'shopping-bag', 10, 1),
  ('Open Data & Education', 'open-data-education', 'Public government datasets, academic research, space exploration, books, and student project APIs.', 'book-open', 11, 1),
  ('Developer Tools & Utilities', 'developer-tools', 'Code execution, URL shorteners, webhooks, feature flags, testing sandboxes, and Git workflows.', 'terminal', 12, 1)
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `icon` = VALUES(`icon`),
  `display_order` = VALUES(`display_order`);

INSERT INTO `plans` (`code`, `name`, `description`, `price_monthly`, `currency`, `billing_interval`, `max_favorites`, `features_json`, `is_active`)
VALUES
  (
    'free',
    'Free Developer',
    'Essential API discovery and exploration tools for every developer.',
    0.00,
    'USD',
    'month',
    5,
    JSON_OBJECT(
      'unlimited_favorites', false,
      'collections', false,
      'comparison', false,
      'advanced_filters', false,
      'recommendations', false,
      'highlights', JSON_ARRAY(
        'Browse and search the entire API directory',
        'Use category, pricing, and authentication filters',
        'View full API details, endpoint examples & docs',
        'Save up to 5 favorite APIs',
        'Submit APIs to the community & write reviews'
      )
    ),
    1
  ),
  (
    'premium_monthly',
    'Premium Pro',
    'Advanced organization, side-by-side comparison, and smart discovery tools for serious builders.',
    5.00,
    'USD',
    'month',
    NULL,
    JSON_OBJECT(
      'unlimited_favorites', true,
      'collections', true,
      'comparison', true,
      'advanced_filters', true,
      'recommendations', true,
      'highlights', JSON_ARRAY(
        'Unlimited favorite APIs across all categories',
        'Personal API collections (AI stack, client projects, school)',
        'Side-by-side API comparison matrix',
        'Advanced technical filters (HTTPS, CORS, OpenAPI, Verified)',
        'Personalized API recommendations based on your stack',
        'Priority access to upcoming developer workspace tools'
      )
    ),
    1
  )
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`);

INSERT INTO `advertising_packages` (`code`, `name`, `placement_type`, `description`, `price`, `currency`, `duration_days`, `features_json`, `is_active`)
VALUES
  (
    'featured_api',
    'Featured API',
    'featured',
    'Appear in the Sponsored Featured strip on Explore and matching Category pages for 7 days.',
    5.00,
    'USD',
    7,
    JSON_OBJECT(
      'placements', JSON_ARRAY('explore_top', 'category_featured'),
      'analytics', true,
      'badge', 'Sponsored · Featured'
    ),
    1
  ),
  (
    'spotlight_api',
    'Spotlight API',
    'spotlight',
    'Sustained 30-day developer visibility across Explore, Category spotlights, and API Details recommendations.',
    15.00,
    'USD',
    30,
    JSON_OBJECT(
      'placements', JSON_ARRAY('explore_top', 'category_featured', 'details_sidebar'),
      'analytics', true,
      'badge', 'Sponsored · Spotlight'
    ),
    1
  ),
  (
    'homepage_promotion',
    'Homepage Promotion',
    'homepage',
    'Maximum visibility on the API Locate Homepage Sponsored Showcase plus Explore and Category placements for 30 days.',
    30.00,
    'USD',
    30,
    JSON_OBJECT(
      'placements', JSON_ARRAY('homepage_showcase', 'explore_top', 'category_featured'),
      'analytics', true,
      'badge', 'Sponsored · Partner'
    ),
    1
  )
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`);

INSERT INTO `api_sources` (`name`, `slug`, `source_type`, `base_url`, `feed_url`, `license_name`, `license_url`, `attribution_text`, `terms_url`, `rate_limit_per_hour`, `auto_publish`, `is_enabled`, `config_json`)
VALUES
  (
    'GitHub REST & Ecosystem OpenAPI Feed',
    'github-openapi-catalog',
    'github_repo',
    'https://api.github.com',
    'https://api.github.com/repos/github/rest-api-description',
    'MIT License',
    'https://github.com/github/rest-api-description/blob/main/LICENSE.md',
    'Sourced from GitHub Official OpenAPI Descriptions (MIT License).',
    'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service',
    30,
    0,
    1,
    JSON_OBJECT('adapter', 'github_openapi_repo', 'max_items_per_run', 10)
  ),
  (
    'NPM Registry Developer APIs Catalog',
    'npm-developer-apis-catalog',
    'public_catalog',
    'https://registry.npmjs.org',
    'https://registry.npmjs.org/-/v1/search?text=openapi+sdk+api&size=12',
    'Public Registry Metadata',
    'https://docs.npmjs.com/policies/open-source-terms',
    'Metadata discovered via official npm Registry Search API.',
    'https://docs.npmjs.com/policies/terms',
    60,
    0,
    1,
    JSON_OBJECT('adapter', 'npm_sdk_catalog', 'max_items_per_run', 10)
  ),
  (
    'APIs.guru OpenAPI Directory',
    'apis-guru-directory',
    'openapi_directory',
    'https://apis.guru',
    'https://api.apis.guru/v2/list.json',
    'CC0-1.0',
    'https://github.com/APIs-guru/openapi-directory/blob/main/LICENSE',
    'API metadata courtesy of APIs.guru Wikipedia for Web APIs (CC0 1.0 Public Domain).',
    'https://apis.guru/',
    20,
    0,
    1,
    JSON_OBJECT('adapter', 'apis_guru_v2', 'max_items_per_run', 25)
  )
ON DUPLICATE KEY UPDATE
  `feed_url` = VALUES(`feed_url`),
  `attribution_text` = VALUES(`attribution_text`);
