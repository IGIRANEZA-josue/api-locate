# API Locate

> **Discover APIs. Organize Resources. Build More.**

**API Locate** is a full-stack developer API discovery, organization, side-by-side comparison, community submission, and provider promotion platform built with **Vue 3 + Vite + Pinia**, **Node.js + Express.js**, and **MySQL (`api_locate`)**.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Project Structure](#2-project-structure)
3. [Implemented Phases & Features](#3-implemented-phases--features)
4. [Database Architecture (24 MySQL Tables)](#4-database-architecture-24-mysql-tables)
5. [Security & Data Integrity Safeguards](#5-security--data-integrity-safeguards)
6. [Step-by-Step Local Setup](#6-step-by-step-local-setup)
7. [Development Seed Accounts](#7-development-seed-accounts)
8. [Testing with Postman & Automated Integration Suite](#8-testing-with-postman--automated-integration-suite)
9. [Production Payment Gateway Configuration](#9-production-payment-gateway-configuration)

---

## 1. Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | Vue.js 3 (Composition API), Vite 6, Vue Router 4, Pinia, Axios, Responsive CSS Variables (`Light` / `Dark` / `System` theme system) |
| **Backend** | Node.js, Express.js, REST API, `mysql2/promise`, `jsonwebtoken` (JWT), `bcrypt` (cost factor 12), `helmet`, `cors`, `express-rate-limit`, `dotenv` |
| **Database** | MySQL InnoDB (`utf8mb4_unicode_ci`) with `FULLTEXT` search indexes and strict foreign-key referential integrity |

---

## 2. Project Structure

```text
api-locate/
├── backend/
│   ├── config/
│   │   └── db.js                   # MySQL connection pool & transaction helper
│   ├── controllers/                # 14 modular REST controllers
│   │   ├── adminController.js
│   │   ├── apiController.js
│   │   ├── authController.js
│   │   ├── campaignController.js
│   │   ├── categoryController.js
│   │   ├── collectionController.js
│   │   ├── compareController.js
│   │   ├── contactController.js
│   │   ├── favoriteController.js
│   │   ├── notificationController.js
│   │   ├── paymentController.js
│   │   ├── providerController.js
│   │   ├── reviewReportController.js
│   │   └── subscriptionController.js
│   ├── middleware/                 # Auth, Admin RBAC, Premium quota, Validation, Error handler
│   ├── routes/                     # 14 Express route modules
│   ├── scripts/
│   │   ├── migrate.js              # Executes database/schema.sql in dependency order
│   │   ├── seed.js                 # Populates development seed data (marked is_seed_data = 1)
│   │   └── test-api.js             # End-to-end backend integration test runner
│   ├── services/
│   │   ├── apiImporterService.js   # Permitted public catalog importer + deduplication
│   │   ├── notificationService.js  # In-app notification helper
│   │   ├── paymentGatewayService.js# HMAC-SHA256 webhook verification & checkout sessions
│   │   └── ssrfGuard.js            # Blocks private/loopback/link-local IPs & bad redirects
│   ├── utils/
│   ├── .env.example
│   ├── index.js
│   └── package.json
├── database/
│   ├── schema.sql                  # Full 24-table MySQL schema in foreign-key dependency order
│   └── seed.sql                    # Optional SQL starter tags companion script
├── frontend/
│   ├── src/
│   │   ├── api/http.js             # Axios instance with JWT interceptor
│   │   ├── assets/styles.css       # Light/Dark/System CSS-variable design system
│   │   ├── components/             # Navbar, Footer, ApiCard, Modals, Compare bar, Subnavs
│   │   ├── router/index.js         # 33 routes + Auth & Admin navigation guards
│   │   ├── stores/                 # Pinia stores (auth, theme, workspace, toast)
│   │   ├── utils/formatters.js
│   │   └── views/
│   │       ├── public/             # 10 public pages
│   │       ├── user/               # 11 developer & provider pages
│   │       └── admin/              # 12 administrator pages + AdminLayout
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── postman/
    └── API-Locate.postman_collection.json
```

---

## 3. Implemented Phases & Features

- **Phase 1 — Foundation & Authentication**: JWT registration/login, bcrypt password hashing, profile management, Light/Dark/System theme persistence (`localStorage` + MySQL `users.theme_preference`), strict `user` vs `admin` role separation.
- **Phase 2 — API Directory, Search & Details**: MySQL `FULLTEXT` search across name, descriptions, and provider combined with category, pricing (`free`, `freemium`, `paid`, `contact`, `unknown`), auth (`none`, `api_key`, `oauth2`, `basic`, `bearer`, `custom`, `unknown`), provider, and tag filters; sorting (`relevant`, `recent`, `alphabetical`, `most_reviewed`); search telemetry in `api_search_logs`; rich endpoint documentation cards.
- **Phase 3 — Community Submissions, Moderation & Permitted Repository Imports**: Three explicit data sources (`admin`, `community`, `imported`); community submissions enter `pending` status until moderated; `api_moderation_logs` audit trail; configurable public catalog importers with source/license attribution and URL/name deduplication.
- **Phase 4 — Developer Organization Tools**:
  - **Favorites**: Free accounts can save up to **5 favorites** (enforced on the backend via `plans.max_favorites`); Premium accounts enjoy unlimited favorites.
  - **Collections** *(Premium)*: Create, rename, delete named project collections and attach per-API notes.
  - **Side-by-Side Comparison** *(Premium)*: Compare 2–4 APIs across authentication, pricing, rate limits, verification level, uptime checks, ratings, and tags.
- **Phase 5 — Freemium Subscription & Verified Billing**: Configurable plans (`free` $0/mo and `premium_monthly` $5/mo default), checkout reference creation, signed HMAC-SHA256 webhook verification (`POST /api/payments/webhook`), idempotent `payment_events` deduplication, subscription cancellation & reactivation, and billing history.
- **Phase 6 — Provider Profiles & Sponsored API Advertising**: Any normal user can create a `provider_profiles` company identity, submit APIs, and launch sponsored campaigns across three configurable packages (**Featured API** $5/7d, **Spotlight API** $15/30d, **Homepage Promotion** $30/30d). Ownership is enforced on the backend, paid campaigns require admin approval before activation, campaigns auto-expire cleanly, and placements are clearly labeled `Sponsored` with impression/click tracking (`sponsored_campaign_events`).
- **Phase 7 — Reviews, Issue Reports, Notifications & SSRF-Safe Live Checks**: 1–5 star developer reviews with automatic aggregate rating recalculation, accuracy/broken-link reporting (`api_reports`), user notifications, and SSRF-protected live HTTP reachability checks.
- **Phase 8 — Complete 12-Page Administrator Console**: Real-time platform metrics, user management, API CRUD, pending submission queue, category & tag CRUD, repository import runner & job history, provider verification, dynamic plan/package configuration, payment audit, and review/report moderation.

---

## 4. Database Architecture (24 MySQL Tables)

All 24 tables in `database/schema.sql` are created in strict foreign-key dependency order:

1. `users`
2. `provider_profiles`
3. `categories`
4. `tags`
5. `api_sources`
6. `plans`
7. `advertising_packages`
8. `apis`
9. `api_tags`
10. `api_endpoints`
11. `favorites`
12. `collections`
13. `collection_apis`
14. `subscriptions`
15. `sponsored_campaigns`
16. `payments`
17. `payment_events`
18. `api_moderation_logs`
19. `api_reviews`
20. `api_reports`
21. `notifications`
22. `api_import_jobs`
23. `api_search_logs`
24. `sponsored_campaign_events`

---

## 5. Security & Data Integrity Safeguards

- **Password Security**: Passwords are validated and hashed using `bcrypt` (12 salt rounds); plain-text passwords are never stored or returned.
- **Payment Security**: Raw card numbers, CVVs, and gateway secrets are never stored in MySQL. Premium subscriptions and ad campaign `paid` states **cannot** be activated from frontend parameters alone — only via HMAC-verified webhooks (`/api/payments/webhook`), server-to-provider verification, or audited administrator invoice settlement. Duplicate webhooks are safely ignored via `UNIQUE (provider, external_event_id)` on `payment_events`.
- **Backend RBAC & Feature Gating**: Every `/api/admin/*` route enforces `requireAuth` + `requireAdmin`. Every Premium endpoint (`/api/collections`, `/api/compare`) and the 5-favorite Free cap are enforced server-side in controllers/middleware. Campaign creation verifies API ownership (`provider_user_id` or `submitted_by_user_id`).
- **SSRF Protection (`backend/services/ssrfGuard.js`)**: Outbound endpoint status checks and public catalog imports validate `http:`/`https:` schemes, resolve DNS (`A` & `AAAA`), block loopback (`127.0.0.0/8`, `::1`), private (`10/8`, `172.16/12`, `192.168/16`), link-local/cloud metadata (`169.254.169.254`), re-validate redirects hop-by-hop, and enforce strict timeouts.
- **Transparency Labels**: Seed listings carry `is_seed_data = 1` (`Dev Seed` badge), verification levels (`Verified Spec`, `Community Reviewed`, `Unverified`) are explicitly displayed, and paid placements always display a `Sponsored` badge without altering organic search relevance.

---

## 6. Step-by-Step Local Setup

### Prerequisites
- **Node.js** `v18+` (tested on Node `v22`) and **npm**
- **MySQL Server** `5.7+` or `8.0+` running on `127.0.0.1:3306`

### Step 1 — Configure Backend Environment Variables
```bash
cd backend
cp .env.example .env
```
Edit `backend/.env` with your local MySQL credentials and strong secrets:
```env
PORT=5000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=api_locate
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_characters
PAYMENT_PROVIDER_MODE=sandbox
PAYMENT_WEBHOOK_SECRET=replace_with_your_webhook_signing_secret
ALLOW_DEV_PAYMENT_SIMULATION=true
```
> **Important for Production**: Set `NODE_ENV=production` and `ALLOW_DEV_PAYMENT_SIMULATION=false` so only real payment gateway webhooks (Stripe / Flutterwave / Paystack) can confirm payments.

### Step 2 — Install Backend Dependencies, Migrate Schema & Seed Data
```bash
cd backend
npm install
npm run db:migrate     # Creates database `api_locate` and all 24 tables
npm run db:seed        # Inserts development seed accounts & sample APIs
```

### Step 3 — Start the Backend API Server
```bash
cd backend
npm start              # Runs on http://localhost:5000 (or `npm run dev` for --watch)
```

### Step 4 — Install & Run the Vue 3 Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev            # Runs Vite on http://localhost:5173 (proxies /api -> :5000)
```
To build optimized production assets:
```bash
cd frontend
npm run build
```

---

## 7. Development Seed Accounts

Running `npm run db:seed` inside `backend/` creates four local development accounts (clearly flagged as development seed data):

| Role / Persona | Email | Password | Preloaded State |
| --- | --- | --- | --- |
| **Administrator** | `admin@apilocate.dev` | `Admin123!` | Full access to all 12 `/admin/*` moderation & analytics pages |
| **API Provider** | `provider@apilocate.dev` | `Developer123!` | Verified `KigaliPay Cloud Labs` profile, published APIs, 1 active & 1 pending campaign |
| **Premium Developer** | `premium@apilocate.dev` | `Developer123!` | Active `$5/mo` Premium plan, unlimited favorites, 2 Collections, Side-by-Side Compare |
| **Free Developer** | `developer@apilocate.dev` | `Developer123!` | Free plan (`3 / 5` favorites used — great for testing the 5-favorite limit & upgrade flow) |

---

## 8. Testing with Postman & Automated Integration Suite

### Automated Backend Integration Tests
With MySQL and the backend server running on port `5000`:
```bash
cd backend
npm test
```
`scripts/test-api.js` verifies health, registration/login, admin RBAC blocking (`403`), MySQL FULLTEXT search, the 5-favorite Free cap, Premium collection/comparison locks, signed HMAC webhook idempotency & Premium activation, community submission moderation, and SSRF protection against `127.0.0.1` / `169.254.169.254`.

### Testing in Postman
1. Open Postman and click **Import**.
2. Select `postman/API-Locate.postman_collection.json`.
3. Confirm the collection variable `baseUrl` is `http://localhost:5000/api`.
4. Run **1. Health & Authentication → Login (Developer Seed Account)** — its post-response test script automatically saves the JWT into `{{token}}`.
5. Run **1. Health & Authentication → Login (Administrator Seed Account)** — saves the admin JWT into `{{adminToken}}`.
6. Execute any discovery, organization, checkout, provider, or administrator request in folders 2–6.

---

## 9. Production Payment Gateway Configuration

No payment provider API keys are invented or hardcoded. When deploying API Locate with a live payment provider (such as **Stripe**, **Flutterwave**, or **Paystack**):

1. Configure these variables in `backend/.env`:
   - `NODE_ENV=production`
   - `ALLOW_DEV_PAYMENT_SIMULATION=false`
   - `PAYMENT_PROVIDER_MODE=stripe` *(or `flutterwave` / `paystack`)*
   - `PAYMENT_WEBHOOK_SECRET=<your_provider_webhook_signing_secret>`
   - `STRIPE_SECRET_KEY=<your_live_or_test_secret_key>` *(or `FLUTTERWAVE_SECRET_KEY` / `PAYSTACK_SECRET_KEY`)*
2. In `backend/services/paymentGatewayService.js`:
   - Update `createProviderCheckoutSession()` to call your chosen gateway's Checkout Session / Payment Link endpoint and return its hosted `checkout_url`.
   - Point your payment provider's webhook dashboard URL to `https://<your-domain>/api/payments/webhook` and pass the signature header (`x-apilocate-signature` / provider HMAC header) verified by `verifyWebhookSignature()`.
