const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { pool, withTransaction } = require('../config/db');
const { slugify } = require('../utils/slugify');

async function seedDevelopmentData() {
  console.log('[Seed] Seeding API Locate development dataset (is_seed_data = 1)...');

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
  const [adminHash, userHash] = await Promise.all([
    bcrypt.hash('Admin123!', saltRounds),
    bcrypt.hash('Developer123!', saltRounds)
  ]);

  await withTransaction(async (conn) => {
    // 1. Development Accounts
    const usersToSeed = [
      {
        username: 'admin',
        email: 'admin@apilocate.dev',
        hash: adminHash,
        full_name: 'Platform Administrator',
        bio: 'API Locate moderation, source governance, and platform operations.',
        role: 'admin',
        theme: 'dark'
      },
      {
        username: 'kigali_cloud',
        email: 'provider@apilocate.dev',
        hash: userHash,
        full_name: 'Aline Uwase',
        bio: 'API Product Lead building developer infrastructure and regional payment APIs.',
        role: 'user',
        theme: 'dark'
      },
      {
        username: 'pro_builder',
        email: 'premium@apilocate.dev',
        hash: userHash,
        full_name: 'Jean-Paul Habimana',
        bio: 'Full-stack engineer comparing and organizing production APIs for client builds.',
        role: 'user',
        theme: 'system'
      },
      {
        username: 'student_dev',
        email: 'developer@apilocate.dev',
        hash: userHash,
        full_name: 'clarisse_dev',
        bio: 'Computer science student exploring free weather, AI, and open data APIs.',
        role: 'user',
        theme: 'light'
      }
    ];

    const userIds = {};
    for (const u of usersToSeed) {
      await conn.query(
        `INSERT INTO users (username, email, password_hash, full_name, bio, role, theme_preference)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           password_hash = VALUES(password_hash),
           full_name = VALUES(full_name),
           role = VALUES(role)`,
        [u.username, u.email, u.hash, u.full_name, u.bio, u.role, u.theme]
      );
      const [[row]] = await conn.query('SELECT id FROM users WHERE email = ?', [u.email]);
      userIds[u.username] = row.id;
    }

    // 2. Provider Profiles
    await conn.query(
      `INSERT INTO provider_profiles
       (user_id, company_name, slug, website_url, contact_email, description, verification_status, verified_at, verified_by)
       VALUES
       (?, 'KigaliPay Cloud Labs', 'kigalipay-cloud-labs', 'https://kigalipay.example.com', 'provider@apilocate.dev',
        'Enterprise & startup developer APIs for Pan-African payments, instant SMS delivery, and FX settlement.', 'verified', UTC_TIMESTAMP(), ?),
       (?, 'OpenStack Studio', 'openstack-studio', 'https://openstackstudio.example.com', 'premium@apilocate.dev',
        'Developer utilities, webhook inspection, and schema validation microservices.', 'pending', NULL, NULL)
       ON DUPLICATE KEY UPDATE
         company_name = VALUES(company_name),
         verification_status = VALUES(verification_status)`,
      [userIds.kigali_cloud, userIds.admin, userIds.pro_builder]
    );

    const [[verifiedProvider]] = await conn.query(
      "SELECT id FROM provider_profiles WHERE slug = 'kigalipay-cloud-labs' LIMIT 1"
    );

    // 3. Category Map
    const [catRows] = await conn.query('SELECT id, slug FROM categories');
    const catMap = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));

    // 4. Curated Development Seed APIs (all marked is_seed_data = 1!)
    const seedApis = [
      {
        name: 'OpenAI Platform API',
        slug: 'openai-platform-api',
        short_description: 'Frontier text, vision, reasoning, audio, and embeddings REST APIs for intelligent applications.',
        full_description: 'The OpenAI Platform API gives developers programmatic access to chat completions, structured JSON outputs, function calling, vector embeddings, speech-to-text, and multimodal vision capabilities.\n\nDesigned with predictable token-based billing, streaming SSE support, and official Node.js and Python SDKs.',
        category_slug: 'ai-machine-learning',
        provider_name: 'OpenAI',
        base_url: 'https://api.openai.com/v1',
        docs_url: 'https://platform.openai.com/docs',
        website_url: 'https://openai.com',
        openapi_spec_url: 'https://github.com/openai/openai-openapi',
        auth_type: 'bearer',
        auth_details: 'Authorization: Bearer $OPENAI_API_KEY header on all requests.',
        pricing_model: 'paid',
        pricing_details: 'Usage-based per 1M input/output tokens.',
        rate_limit_info: 'Tiered RPM/TPM quotas based on organization usage tier.',
        https_supported: 1,
        cors_supported: 'no',
        source_type: 'admin',
        verification_level: 'verified',
        status: 'approved',
        is_featured: 1,
        submitted_by: userIds.admin,
        owner_user_id: userIds.admin,
        provider_profile_id: null,
        features: { sdks: ['Node.js', 'Python', 'Go', '.NET'], streaming: true, webhooks: true, sla: '99.9%' },
        tags: ['llm', 'embeddings', 'ai', 'streaming', 'json-schema'],
        endpoints: [
          {
            http_method: 'POST',
            path: '/chat/completions',
            summary: 'Create a model response for a chat conversation',
            description: 'Generates structured or streamed assistant responses from a list of messages.',
            auth_required: 1,
            sample_request: '{\n  "model": "gpt-4o-mini",\n  "messages": [{ "role": "user", "content": "Explain REST pagination" }]\n}',
            sample_response: '{\n  "id": "chatcmpl-9f2k",\n  "choices": [{ "message": { "role": "assistant", "content": "Cursor and offset pagination..." } }]\n}'
          },
          {
            http_method: 'POST',
            path: '/embeddings',
            summary: 'Generate vector embeddings for semantic search',
            description: 'Returns floating-point embedding vectors representing input text.',
            auth_required: 1,
            sample_request: '{\n  "model": "text-embedding-3-small",\n  "input": "payment gateway api"\n}',
            sample_response: '{\n  "object": "list",\n  "data": [{ "embedding": [0.0123, -0.0412, 0.0089] }]\n}'
          }
        ]
      },
      {
        name: 'Stripe Payments & Billing API',
        slug: 'stripe-payments-billing-api',
        short_description: 'Global payment processing, recurring SaaS subscriptions, checkout sessions, and signed webhooks.',
        full_description: 'Stripe provides RESTful financial infrastructure APIs for accepting cards, wallets, bank transfers, and managing recurring subscription lifecycles.\n\nIncludes idempotency keys, test-mode sandboxes, Stripe CLI webhook forwarding, and granular event logs.',
        category_slug: 'payments-fintech',
        provider_name: 'Stripe',
        base_url: 'https://api.stripe.com/v1',
        docs_url: 'https://docs.stripe.com/api',
        website_url: 'https://stripe.com',
        openapi_spec_url: 'https://github.com/stripe/openapi',
        auth_type: 'bearer',
        auth_details: 'Bearer sk_test_... or HTTP Basic Auth with secret key as username.',
        pricing_model: 'paid',
        pricing_details: 'Pay-as-you-go per successful transaction (e.g., 2.9% + 30c); free test sandbox.',
        rate_limit_info: '100 read/write ops per second in live mode.',
        https_supported: 1,
        cors_supported: 'no',
        source_type: 'admin',
        verification_level: 'verified',
        status: 'approved',
        is_featured: 1,
        submitted_by: userIds.admin,
        owner_user_id: userIds.admin,
        provider_profile_id: null,
        features: { sdks: ['Node.js', 'Python', 'Ruby', 'Java', 'Go', 'PHP'], webhooks: true, idempotency: true, sandbox: true },
        tags: ['payments', 'subscriptions', 'webhooks', 'billing', 'checkout'],
        endpoints: [
          {
            http_method: 'POST',
            path: '/checkout/sessions',
            summary: 'Create a hosted Checkout Session',
            description: 'Creates a secure hosted payment or subscription checkout flow.',
            auth_required: 1,
            sample_request: 'mode=subscription&line_items[0][price]=price_1Pxyz&success_url=https://example.com/ok',
            sample_response: '{\n  "id": "cs_test_a1b2c3",\n  "object": "checkout.session",\n  "url": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3"\n}'
          },
          {
            http_method: 'GET',
            path: '/customers',
            summary: 'List customer records',
            description: 'Returns paginated customer objects sorted by creation date.',
            auth_required: 1,
            sample_request: 'GET /v1/customers?limit=3',
            sample_response: '{\n  "object": "list",\n  "has_more": false,\n  "data": [{ "id": "cus_Q123", "email": "dev@example.com" }]\n}'
          }
        ]
      },
      {
        name: 'KigaliPay Mobile Money & FX API',
        slug: 'kigalipay-mobile-money-fx-api',
        short_description: 'Unified East African Mobile Money collections, instant payouts, and real-time RWF/KES/UGX/USD FX rates.',
        full_description: 'Built by KigaliPay Cloud Labs, this developer-first REST API streamlines mobile money push prompts, merchant disbursements, and multi-currency settlement across East Africa.\n\nFeatures instant HMAC-SHA256 webhook callbacks, sandbox test phone numbers, and automatic reconciliation.',
        category_slug: 'payments-fintech',
        provider_name: 'KigaliPay Cloud Labs',
        base_url: 'https://api.kigalipay.example.com/v2',
        docs_url: 'https://docs.kigalipay.example.com',
        website_url: 'https://kigalipay.example.com',
        openapi_spec_url: 'https://docs.kigalipay.example.com/openapi.json',
        auth_type: 'api_key',
        auth_details: 'Pass X-Api-Key and X-Request-Timestamp headers.',
        pricing_model: 'freemium',
        pricing_details: 'Free developer sandbox + first 100 live FX lookups/day free; 1.5% on collections.',
        rate_limit_info: '120 requests/minute per API key.',
        https_supported: 1,
        cors_supported: 'yes',
        source_type: 'community',
        verification_level: 'verified',
        status: 'approved',
        is_featured: 1,
        submitted_by: userIds.kigali_cloud,
        owner_user_id: userIds.kigali_cloud,
        provider_profile_id: verifiedProvider?.id || null,
        features: { sdks: ['Node.js', 'Python', 'Flutter'], webhooks: true, sandbox: true, mobile_money: true },
        tags: ['mobile-money', 'fintech', 'fx-rates', 'africa', 'webhooks'],
        endpoints: [
          {
            http_method: 'POST',
            path: '/collections/momo-push',
            summary: 'Initiate a Mobile Money USSD payment prompt',
            description: 'Sends an asynchronous payment prompt to the customer handset and notifies webhook on completion.',
            auth_required: 1,
            sample_request: '{\n  "amount": 5000,\n  "currency": "RWF",\n  "phone": "+250780000000",\n  "reference": "INV-2026-88"\n}',
            sample_response: '{\n  "status": "pending_confirmation",\n  "transaction_id": "kp_tx_908172",\n  "reference": "INV-2026-88"\n}'
          },
          {
            http_method: 'GET',
            path: '/fx/rates',
            summary: 'Fetch real-time mid-market and settlement FX rates',
            description: 'Returns live conversion rates between USD, RWF, KES, UGX, and EUR.',
            auth_required: 1,
            sample_request: 'GET /v2/fx/rates?base=USD&symbols=RWF,KES',
            sample_response: '{\n  "base": "USD",\n  "rates": { "RWF": 1385.50, "KES": 129.40 }\n}'
          }
        ]
      },
      {
        name: 'Open-Meteo Weather Forecast API',
        slug: 'open-meteo-weather-forecast-api',
        short_description: 'Fast, open-source global weather forecasts, historical climate data, and air quality with zero API keys.',
        full_description: 'Open-Meteo partners with national weather services to deliver high-resolution 1-11 km global weather forecasts in clean JSON.\n\nNo registration or API key is required for non-commercial and educational projects, making it ideal for students, prototypes, and dashboards.',
        category_slug: 'weather-environment',
        provider_name: 'Open-Meteo',
        base_url: 'https://api.open-meteo.com/v1',
        docs_url: 'https://open-meteo.com/en/docs',
        website_url: 'https://open-meteo.com',
        openapi_spec_url: 'https://raw.githubusercontent.com/open-meteo/open-meteo/main/openapi.yml',
        auth_type: 'none',
        auth_details: 'No authentication required for free non-commercial tier.',
        pricing_model: 'free',
        pricing_details: 'Free up to 10,000 calls/day for non-commercial use; commercial plans available.',
        rate_limit_info: '10,000 requests/day on free public endpoint.',
        https_supported: 1,
        cors_supported: 'yes',
        source_type: 'admin',
        verification_level: 'verified',
        status: 'approved',
        is_featured: 1,
        submitted_by: userIds.admin,
        owner_user_id: userIds.admin,
        provider_profile_id: null,
        features: { sdks: ['TypeScript', 'Python', 'Swift'], cors: true, open_source: true, zero_auth: true },
        tags: ['weather', 'forecast', 'climate', 'free-api', 'no-auth'],
        endpoints: [
          {
            http_method: 'GET',
            path: '/forecast',
            summary: 'Get hourly and 7-day weather forecast by coordinates',
            description: 'Returns temperature, precipitation, wind speed, and weather codes.',
            auth_required: 0,
            sample_request: 'GET /v1/forecast?latitude=-1.95&longitude=30.06&current_weather=true',
            sample_response: '{\n  "latitude": -1.95,\n  "longitude": 30.06,\n  "current_weather": { "temperature": 24.2, "windspeed": 9.4 }\n}'
          }
        ]
      },
      {
        name: 'GitHub REST & GraphQL API',
        slug: 'github-rest-graphql-api',
        short_description: 'Automate repositories, pull requests, GitHub Actions CI/CD workflows, issues, and code search.',
        full_description: 'The official GitHub API allows developers to integrate deeply with repositories, organizations, branches, commits, checks, releases, and security advisories.\n\nSupports fine-grained Personal Access Tokens, GitHub Apps, and OAuth 2.0 flows.',
        category_slug: 'developer-tools',
        provider_name: 'GitHub',
        base_url: 'https://api.github.com',
        docs_url: 'https://docs.github.com/en/rest',
        website_url: 'https://github.com',
        openapi_spec_url: 'https://github.com/github/rest-api-description',
        auth_type: 'bearer',
        auth_details: 'Bearer fine-grained PAT or OAuth 2.0 token; unauthenticated read up to 60 req/hr.',
        pricing_model: 'freemium',
        pricing_details: 'Included free with every GitHub account; enterprise quotas with GitHub Enterprise.',
        rate_limit_info: '5,000 requests/hour authenticated; 60/hour unauthenticated.',
        https_supported: 1,
        cors_supported: 'yes',
        source_type: 'admin',
        verification_level: 'verified',
        status: 'approved',
        is_featured: 1,
        submitted_by: userIds.admin,
        owner_user_id: userIds.admin,
        provider_profile_id: null,
        features: { sdks: ['Octokit JS', 'PyGithub', 'Go-GitHub'], webhooks: true, graphql: true, openapi: true },
        tags: ['git', 'devops', 'ci-cd', 'graphql', 'repositories'],
        endpoints: [
          {
            http_method: 'GET',
            path: '/repos/{owner}/{repo}',
            summary: 'Get repository metadata and statistics',
            description: 'Returns stars, forks, default branch, license, and visibility details.',
            auth_required: 0,
            sample_request: 'GET https://api.github.com/repos/vuejs/core',
            sample_response: '{\n  "full_name": "vuejs/core",\n  "default_branch": "main",\n  "stargazers_count": 48200\n}'
          }
        ]
      },
      {
        name: 'Auth0 Universal Identity API',
        slug: 'auth0-universal-identity-api',
        short_description: 'Drop-in OAuth 2.0, OpenID Connect, Passkeys, social login, RBAC, and enterprise SAML SSO.',
        full_description: 'Auth0 Authentication and Management APIs handle user login, MFA, passwordless magic links, passkeys, JWT issuance, and organization-level SSO without rolling custom identity infrastructure.',
        category_slug: 'authentication-security',
        provider_name: 'Okta / Auth0',
        base_url: 'https://YOUR_DOMAIN.auth0.com/api/v2',
        docs_url: 'https://auth0.com/docs/api',
        website_url: 'https://auth0.com',
        openapi_spec_url: null,
        auth_type: 'oauth2',
        auth_details: 'OAuth 2.0 Client Credentials / Authorization Code with PKCE.',
        pricing_model: 'freemium',
        pricing_details: 'Free tier up to 25,000 Monthly Active Users; paid B2C/B2B plans.',
        rate_limit_info: 'Burst up to 50 req/sec depending on plan.',
        https_supported: 1,
        cors_supported: 'yes',
        source_type: 'admin',
        verification_level: 'verified',
        status: 'approved',
        is_featured: 0,
        submitted_by: userIds.admin,
        owner_user_id: userIds.admin,
        provider_profile_id: null,
        features: { sdks: ['Vue', 'React', 'Node.js', 'Python'], oauth2: true, passkeys: true, rbac: true },
        tags: ['oauth2', 'jwt', 'authentication', 'sso', 'passkeys'],
        endpoints: [
          {
            http_method: 'POST',
            path: '/oauth/token',
            summary: 'Exchange authorization code or client credentials for JWT',
            description: 'Issues signed access_token and id_token.',
            auth_required: 0,
            sample_request: '{\n  "grant_type": "client_credentials",\n  "client_id": "...",\n  "audience": "https://api.example.com"\n}',
            sample_response: '{\n  "access_token": "eyJhbGciOiJSUzI1NiIs...",\n  "token_type": "Bearer",\n  "expires_in": 86400\n}'
          }
        ]
      },
      {
        name: 'Resend Transactional Email API',
        slug: 'resend-transactional-email-api',
        short_description: 'Modern developer email API with high deliverability, DKIM/SPF setup, batching, and webhook tracking.',
        full_description: 'Resend is built for developers sending transactional password resets, verification codes, receipts, and product notifications via clean REST endpoints.',
        category_slug: 'communication-messaging',
        provider_name: 'Resend',
        base_url: 'https://api.resend.com',
        docs_url: 'https://resend.com/docs/api-reference/introduction',
        website_url: 'https://resend.com',
        openapi_spec_url: 'https://raw.githubusercontent.com/resend/resend-openapi/main/resend.yaml',
        auth_type: 'bearer',
        auth_details: 'Authorization: Bearer re_123456789',
        pricing_model: 'freemium',
        pricing_details: 'Free up to 3,000 emails/month (100/day); Pro starts at $20/mo.',
        rate_limit_info: '10 requests/second default.',
        https_supported: 1,
        cors_supported: 'no',
        source_type: 'admin',
        verification_level: 'verified',
        status: 'approved',
        is_featured: 1,
        submitted_by: userIds.admin,
        owner_user_id: userIds.admin,
        provider_profile_id: null,
        features: { sdks: ['Node.js', 'Python', 'Go', 'Rust', 'PHP'], webhooks: true, idempotency: true },
        tags: ['email', 'smtp', 'notifications', 'webhooks'],
        endpoints: [
          {
            http_method: 'POST',
            path: '/emails',
            summary: 'Send a transactional email',
            description: 'Dispatches an HTML or plain-text email and returns message ID.',
            auth_required: 1,
            sample_request: '{\n  "from": "noreply@apilocate.dev",\n  "to": ["dev@example.com"],\n  "subject": "Verify your account",\n  "html": "<p>Welcome!</p>"\n}',
            sample_response: '{\n  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"\n}'
          }
        ]
      },
      {
        name: 'KigaliPulse Instant SMS & OTP API',
        slug: 'kigalipulse-instant-sms-otp-api',
        short_description: 'Low-latency transactional SMS, two-factor OTP verification, and delivery receipts across 40+ countries.',
        full_description: 'KigaliPulse provides direct carrier routes for authentication OTP codes, order alerts, and scheduled SMS notifications with automatic sender-ID management.',
        category_slug: 'communication-messaging',
        provider_name: 'KigaliPay Cloud Labs',
        base_url: 'https://sms.kigalipay.example.com/v1',
        docs_url: 'https://docs.kigalipay.example.com/sms',
        website_url: 'https://kigalipay.example.com/sms',
        openapi_spec_url: null,
        auth_type: 'api_key',
        auth_details: 'Header X-Pulse-Key: kp_live_...',
        pricing_model: 'freemium',
        pricing_details: '50 free test SMS credits on signup; pay-per-segment thereafter.',
        rate_limit_info: '60 OTP dispatches/minute.',
        https_supported: 1,
        cors_supported: 'no',
        source_type: 'community',
        verification_level: 'verified',
        status: 'approved',
        is_featured: 0,
        submitted_by: userIds.kigali_cloud,
        owner_user_id: userIds.kigali_cloud,
        provider_profile_id: verifiedProvider?.id || null,
        features: { sdks: ['Node.js', 'Python'], otp_verify: true, webhooks: true },
        tags: ['sms', 'otp', '2fa', 'messaging'],
        endpoints: [
          {
            http_method: 'POST',
            path: '/otp/send',
            summary: 'Generate and deliver a 6-digit SMS OTP code',
            description: 'Sends a time-bound OTP code with automatic expiry handling.',
            auth_required: 1,
            sample_request: '{\n  "to": "+250788000111",\n  "ttl_seconds": 300\n}',
            sample_response: '{\n  "verification_id": "ver_8821",\n  "expires_in": 300\n}'
          }
        ]
      },
      {
        name: 'Mapbox Geocoding & Navigation API',
        slug: 'mapbox-geocoding-navigation-api',
        short_description: 'Forward/reverse geocoding, turn-by-turn directions, isochrones, and custom vector map tiles.',
        full_description: 'Mapbox Web Services APIs empower delivery apps, store locators, and fleet tracking platforms with accurate global address search, matrix travel times, and static map rendering.',
        category_slug: 'geolocation-maps',
        provider_name: 'Mapbox',
        base_url: 'https://api.mapbox.com',
        docs_url: 'https://docs.mapbox.com/api/overview/',
        website_url: 'https://www.mapbox.com',
        openapi_spec_url: null,
        auth_type: 'api_key',
        auth_details: 'Pass access_token query parameter.',
        pricing_model: 'freemium',
        pricing_details: 'Generous monthly free tier (100,000 geocoding requests/mo free).',
        rate_limit_info: '600 requests/minute per endpoint.',
        https_supported: 1,
        cors_supported: 'yes',
        source_type: 'admin',
        verification_level: 'verified',
        status: 'approved',
        is_featured: 0,
        submitted_by: userIds.admin,
        owner_user_id: userIds.admin,
        provider_profile_id: null,
        features: { sdks: ['JS GL', 'iOS', 'Android', 'Python'], cors: true },
        tags: ['maps', 'geocoding', 'routing', 'geolocation'],
        endpoints: [
          {
            http_method: 'GET',
            path: '/search/geocode/v6/forward',
            summary: 'Convert place names into geographic coordinates',
            description: 'Returns GeoJSON FeatureCollection matching query text.',
            auth_required: 1,
            sample_request: 'GET /search/geocode/v6/forward?q=Kigali+Heights&access_token=pk.eyJ...',
            sample_response: '{\n  "type": "FeatureCollection",\n  "features": [{ "geometry": { "coordinates": [30.092, -1.954] } }]\n}'
          }
        ]
      },
      {
        name: 'NASA Open Science & Astronomy APIs',
        slug: 'nasa-open-science-astronomy-apis',
        short_description: 'Astronomy Picture of the Day, Mars Rover imagery, Near-Earth asteroid tracking, and Earth observation.',
        full_description: 'NASA Open APIs make space exploration telemetry, planetary imagery, and orbital datasets freely accessible to students, educators, and software developers.',
        category_slug: 'open-data-education',
        provider_name: 'NASA',
        base_url: 'https://api.nasa.gov',
        docs_url: 'https://api.nasa.gov',
        website_url: 'https://www.nasa.gov',
        openapi_spec_url: null,
        auth_type: 'api_key',
        auth_details: 'Query param api_key=DEMO_KEY or free registered key.',
        pricing_model: 'free',
        pricing_details: '100% free public domain data.',
        rate_limit_info: '1,000 requests/hour with free key; 30/hour with DEMO_KEY.',
        https_supported: 1,
        cors_supported: 'yes',
        source_type: 'admin',
        verification_level: 'verified',
        status: 'approved',
        is_featured: 0,
        submitted_by: userIds.admin,
        owner_user_id: userIds.admin,
        provider_profile_id: null,
        features: { sdks: ['Community JS/Python'], cors: true, public_domain: true },
        tags: ['space', 'education', 'free-api', 'open-data'],
        endpoints: [
          {
            http_method: 'GET',
            path: '/planetary/apod',
            summary: 'Retrieve the Astronomy Picture of the Day',
            description: 'Returns daily space photograph URL, HD image, and astronomer explanation.',
            auth_required: 1,
            sample_request: 'GET https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY',
            sample_response: '{\n  "title": "Pillars of Creation",\n  "media_type": "image",\n  "url": "https://apod.nasa.gov/..."\n}'
          }
        ]
      },
      {
        name: 'Cloudflare Workers & DNS API',
        slug: 'cloudflare-workers-dns-api',
        short_description: 'Programmatic DNS record management, zero-egress R2 storage, SSL certificates, and serverless edge deploys.',
        full_description: 'Manage zones, DNS records, WAF rules, cache purges, KV namespaces, and Workers scripts globally via Cloudflare v4 REST endpoints.',
        category_slug: 'cloud-devops',
        provider_name: 'Cloudflare',
        base_url: 'https://api.cloudflare.com/client/v4',
        docs_url: 'https://developers.cloudflare.com/api/',
        website_url: 'https://www.cloudflare.com',
        openapi_spec_url: 'https://github.com/cloudflare/api-schemas',
        auth_type: 'bearer',
        auth_details: 'Authorization: Bearer <Scoped_API_Token>',
        pricing_model: 'freemium',
        pricing_details: 'Free DNS & 100k Workers requests/day; paid Pro/Workers Unbound plans.',
        rate_limit_info: '1,200 requests per 5 minutes.',
        https_supported: 1,
        cors_supported: 'no',
        source_type: 'admin',
        verification_level: 'verified',
        status: 'approved',
        is_featured: 0,
        submitted_by: userIds.admin,
        owner_user_id: userIds.admin,
        provider_profile_id: null,
        features: { sdks: ['TypeScript', 'Go', 'Python', 'Terraform'], openapi: true },
        tags: ['dns', 'serverless', 'edge', 'cloud', 'cdn'],
        endpoints: [
          {
            http_method: 'GET',
            path: '/zones/{zone_id}/dns_records',
            summary: 'List DNS records in a zone',
            description: 'Filters A, AAAA, CNAME, MX, and TXT records.',
            auth_required: 1,
            sample_request: 'GET /client/v4/zones/023e105f4ecef8ad9ca31a8372d0c353/dns_records?type=A',
            sample_response: '{\n  "success": true,\n  "result": [{ "name": "api.example.com", "type": "A", "content": "198.51.100.4" }]\n}'
          }
        ]
      },
      {
        name: 'Cloudinary Programmable Media API',
        slug: 'cloudinary-programmable-media-api',
        short_description: 'Upload, resize, crop, transcode, and auto-optimize images and videos on the fly.',
        full_description: 'Cloudinary provides upload, transformation, AI background removal, and global CDN delivery APIs for responsive web and mobile media.',
        category_slug: 'media-video-audio',
        provider_name: 'Cloudinary',
        base_url: 'https://api.cloudinary.com/v1_1',
        docs_url: 'https://cloudinary.com/documentation/image_upload_api_reference',
        website_url: 'https://cloudinary.com',
        openapi_spec_url: null,
        auth_type: 'basic',
        auth_details: 'HTTP Basic Auth (API_KEY:API_SECRET) or signed upload presets.',
        pricing_model: 'freemium',
        pricing_details: '25 free monthly credits (~25GB bandwidth or storage).',
        rate_limit_info: '500 admin API calls/hour on Free plan.',
        https_supported: 1,
        cors_supported: 'yes',
        source_type: 'community',
        verification_level: 'community_reviewed',
        status: 'approved',
        is_featured: 0,
        submitted_by: userIds.pro_builder,
        owner_user_id: null,
        provider_profile_id: null,
        features: { sdks: ['Node.js', 'Vue', 'React', 'Python'], cors: true },
        tags: ['images', 'video', 'cdn', 'media'],
        endpoints: [
          {
            http_method: 'POST',
            path: '/{cloud_name}/image/upload',
            summary: 'Upload and transform an image asset',
            description: 'Accepts multipart file, remote URL, or base64 data URI.',
            auth_required: 1,
            sample_request: 'POST file=@avatar.png&upload_preset=unsigned_avatars',
            sample_response: '{\n  "public_id": "avatars/u91",\n  "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/avatars/u91.webp"\n}'
          }
        ]
      },
      {
        name: 'Meilisearch Instant Search API',
        slug: 'meilisearch-instant-search-api',
        short_description: 'Sub-50ms typo-tolerant full-text, faceted, and hybrid vector search engine REST API.',
        full_description: 'Meilisearch exposes an intuitive RESTful API for indexing JSON documents and querying them with instant typo tolerance, synonyms, geo-filtering, and hybrid semantic search.',
        category_slug: 'data-analytics',
        provider_name: 'Meilisearch',
        base_url: 'https://ms-demo.meilisearch.com',
        docs_url: 'https://www.meilisearch.com/docs/reference/api/overview',
        website_url: 'https://www.meilisearch.com',
        openapi_spec_url: 'https://github.com/meilisearch/open-api',
        auth_type: 'bearer',
        auth_details: 'Authorization: Bearer MASTER_OR_SEARCH_API_KEY',
        pricing_model: 'freemium',
        pricing_details: '100% Free self-hosted MIT open-source; Meilisearch Cloud starts at $30/mo.',
        rate_limit_info: 'Unlimited self-hosted; plan-based on Cloud.',
        https_supported: 1,
        cors_supported: 'yes',
        source_type: 'community',
        verification_level: 'community_reviewed',
        status: 'approved',
        is_featured: 0,
        submitted_by: userIds.pro_builder,
        owner_user_id: null,
        provider_profile_id: null,
        features: { sdks: ['JS', 'Vue InstantSearch', 'Python', 'Rust', 'Go'], cors: true, open_source: true },
        tags: ['search', 'fulltext', 'analytics', 'open-source'],
        endpoints: [
          {
            http_method: 'POST',
            path: '/indexes/{index_uid}/search',
            summary: 'Execute typo-tolerant faceted search query',
            description: 'Searches indexed documents and returns hits + facet distributions.',
            auth_required: 1,
            sample_request: '{\n  "q": "paymnt gateway",\n  "filter": ["pricing = free"],\n  "limit": 10\n}',
            sample_response: '{\n  "hits": [{ "id": 2, "name": "Stripe" }],\n  "processingTimeMs": 4\n}'
          }
        ]
      },
      {
        name: 'SchemaGuard JSON Validator API',
        slug: 'schemaguard-json-validator-api',
        short_description: 'Community-submitted microservice for validating webhook payloads against OpenAPI 3.1 schemas.',
        full_description: 'Submitted by OpenStack Studio for community review. Validates incoming JSON bodies against Draft 2020-12 JSON Schema definitions with detailed pointer diagnostics.',
        category_slug: 'developer-tools',
        provider_name: 'OpenStack Studio',
        base_url: 'https://schemaguard.openstackstudio.example.com/v1',
        docs_url: 'https://openstackstudio.example.com/docs/schemaguard',
        website_url: 'https://openstackstudio.example.com',
        openapi_spec_url: null,
        auth_type: 'api_key',
        auth_details: 'X-SchemaGuard-Token header.',
        pricing_model: 'free',
        pricing_details: 'Free community beta.',
        rate_limit_info: '30 requests/minute.',
        https_supported: 1,
        cors_supported: 'unknown',
        source_type: 'community',
        verification_level: 'unverified',
        status: 'pending',
        is_featured: 0,
        submitted_by: userIds.pro_builder,
        owner_user_id: userIds.pro_builder,
        provider_profile_id: null,
        features: { sdks: ['Node.js'], webhooks: false },
        tags: ['json-schema', 'validation', 'openapi'],
        endpoints: []
      }
    ];

    const apiIdBySlug = {};

    for (const item of seedApis) {
      const categoryId = catMap[item.category_slug] || catRows[0].id;

      await conn.query(
        `INSERT INTO apis (
          name, slug, short_description, full_description,
          category_id, provider_profile_id, provider_name, submitted_by, owner_user_id,
          base_url, docs_url, website_url, openapi_spec_url,
          auth_type, auth_details, pricing_model, pricing_details, rate_limit_info,
          https_supported, cors_supported,
          source_type, is_seed_data, verification_level, operational_status,
          status, is_featured, features_json, published_at, views_count
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, 1, ?, 'operational',
          ?, ?, ?, ?, ?
        )
        ON DUPLICATE KEY UPDATE
          short_description = VALUES(short_description),
          full_description = VALUES(full_description),
          is_seed_data = 1,
          features_json = VALUES(features_json)`,
        [
          item.name,
          item.slug,
          item.short_description,
          item.full_description,
          categoryId,
          item.provider_profile_id,
          item.provider_name,
          item.submitted_by,
          item.owner_user_id,
          item.base_url,
          item.docs_url,
          item.website_url,
          item.openapi_spec_url,
          item.auth_type,
          item.auth_details,
          item.pricing_model,
          item.pricing_details,
          item.rate_limit_info,
          item.https_supported,
          item.cors_supported,
          item.source_type,
          item.verification_level,
          item.status,
          item.is_featured,
          JSON.stringify(item.features || {}),
          item.status === 'approved' ? new Date() : null,
          Math.floor(Math.random() * 280) + 45
        ]
      );

      const [[apiRow]] = await conn.query('SELECT id FROM apis WHERE slug = ?', [item.slug]);
      apiIdBySlug[item.slug] = apiRow.id;

      // Tags
      for (const tagName of item.tags) {
        const tagSlug = slugify(tagName);
        await conn.query(
          'INSERT INTO tags (name, slug) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
          [tagName, tagSlug]
        );
        const [[tRow]] = await conn.query('SELECT id FROM tags WHERE slug = ?', [tagSlug]);
        await conn.query('INSERT IGNORE INTO api_tags (api_id, tag_id) VALUES (?, ?)', [
          apiRow.id,
          tRow.id
        ]);
      }

      // Endpoints
      const [[epCount]] = await conn.query(
        'SELECT COUNT(*) AS count FROM api_endpoints WHERE api_id = ?',
        [apiRow.id]
      );
      if (epCount.count === 0 && item.endpoints.length > 0) {
        for (const ep of item.endpoints) {
          await conn.query(
            `INSERT INTO api_endpoints
             (api_id, http_method, path, summary, description, auth_required, sample_request, sample_response)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              apiRow.id,
              ep.http_method,
              ep.path,
              ep.summary,
              ep.description,
              ep.auth_required,
              ep.sample_request,
              ep.sample_response
            ]
          );
        }
      }
    }

    // 5. Reviews & Rating Aggregation
    const seedReviews = [
      {
        api_slug: 'openai-platform-api',
        user_id: userIds.pro_builder,
        rating: 5,
        title: 'Structured JSON outputs saved weeks of parsing work',
        comment: 'The Node.js SDK + JSON Schema strict mode works reliably in production microservices.'
      },
      {
        api_slug: 'openai-platform-api',
        user_id: userIds.student_dev,
        rating: 4,
        title: 'Clear docs for beginners, watch token budgets',
        comment: 'Super easy quickstart examples, just make sure to configure monthly usage caps.'
      },
      {
        api_slug: 'stripe-payments-billing-api',
        user_id: userIds.pro_builder,
        rating: 5,
        title: 'Gold-standard webhook design and idempotency',
        comment: 'Signed Stripe-Signature headers and test clocks make subscription billing straightforward to test.'
      },
      {
        api_slug: 'kigalipay-mobile-money-fx-api',
        user_id: userIds.pro_builder,
        rating: 5,
        title: 'Fastest RWF & KES Mobile Money sandbox we tested',
        comment: 'Webhook callbacks arrive within 2 seconds in sandbox and FX rates endpoint is rock solid.'
      },
      {
        api_slug: 'open-meteo-weather-forecast-api',
        user_id: userIds.student_dev,
        rating: 5,
        title: 'Best zero-key API for university & frontend projects',
        comment: 'CORS works out of the box and no credit card or API key needed for learning.'
      },
      {
        api_slug: 'resend-transactional-email-api',
        user_id: userIds.kigali_cloud,
        rating: 5,
        title: 'Cleanest transactional email developer experience',
        comment: 'Integrated password reset emails in 10 minutes.'
      }
    ];

    for (const rev of seedReviews) {
      const apiId = apiIdBySlug[rev.api_slug];
      if (!apiId) continue;
      await conn.query(
        `INSERT INTO api_reviews (api_id, user_id, rating, title, comment, status)
         VALUES (?, ?, ?, ?, ?, 'visible')
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
        [apiId, rev.user_id, rev.rating, rev.title, rev.comment]
      );
    }

    // Recalculate ratings for all seeded APIs
    for (const apiId of Object.values(apiIdBySlug)) {
      const [[agg]] = await conn.query(
        "SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS avg_rating FROM api_reviews WHERE api_id = ? AND status = 'visible'",
        [apiId]
      );
      await conn.query('UPDATE apis SET reviews_count = ?, average_rating = ? WHERE id = ?', [
        agg.count,
        Number(Number(agg.avg_rating).toFixed(2)),
        apiId
      ]);
    }

    // 6. Seed Active Premium Subscription for pro_builder (dev seed account)
    const [[premiumPlan]] = await conn.query(
      "SELECT id, price_monthly FROM plans WHERE code = 'premium_monthly' LIMIT 1"
    );

    const [existingSub] = await conn.query(
      "SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1",
      [userIds.pro_builder]
    );

    if (existingSub.length === 0 && premiumPlan) {
      const [subIns] = await conn.query(
        `INSERT INTO subscriptions
         (user_id, plan_id, status, payment_provider, external_subscription_id, auto_renew, current_period_start, current_period_end)
         VALUES (?, ?, 'active', 'seed_dev_verified', 'sub_seed_demo_001', 1, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))`,
        [userIds.pro_builder, premiumPlan.id]
      );

      await conn.query(
        `INSERT INTO payments
         (user_id, payment_for, subscription_id, payment_reference, provider, provider_transaction_id, amount, currency, status, metadata_json, paid_at)
         VALUES (?, 'subscription', ?, 'PAY-SUB-SEED-DEMO01', 'seed_dev_verified', 'tx_seed_sub_01', ?, 'USD', 'succeeded', ?, UTC_TIMESTAMP())`,
        [
          userIds.pro_builder,
          subIns.insertId,
          premiumPlan.price_monthly,
          JSON.stringify({ seed_note: 'Development seed verified subscription payment' })
        ]
      );
    }

    // 7. Seed Favorites & Collections
    const proFavSlugs = [
      'openai-platform-api',
      'stripe-payments-billing-api',
      'kigalipay-mobile-money-fx-api',
      'resend-transactional-email-api'
    ];
    for (const s of proFavSlugs) {
      if (apiIdBySlug[s]) {
        await conn.query('INSERT IGNORE INTO favorites (user_id, api_id) VALUES (?, ?)', [
          userIds.pro_builder,
          apiIdBySlug[s]
        ]);
      }
    }

    const studentFavSlugs = ['open-meteo-weather-forecast-api', 'nasa-open-science-astronomy-apis', 'github-rest-graphql-api'];
    for (const s of studentFavSlugs) {
      if (apiIdBySlug[s]) {
        await conn.query('INSERT IGNORE INTO favorites (user_id, api_id) VALUES (?, ?)', [
          userIds.student_dev,
          apiIdBySlug[s]
        ]);
      }
    }

    for (const apiId of Object.values(apiIdBySlug)) {
      const [[fc]] = await conn.query('SELECT COUNT(*) AS count FROM favorites WHERE api_id = ?', [apiId]);
      await conn.query('UPDATE apis SET favorites_count = ? WHERE id = ?', [fc.count, apiId]);
    }

    // Collections for pro_builder
    await conn.query(
      `INSERT INTO collections (user_id, name, slug, description, is_public)
       VALUES
       (?, 'SaaS FinTech Stack', 'saas-fintech-stack', 'Core payment, mobile money, identity, and email APIs for SaaS launches.', 1),
       (?, 'AI & Search Pipeline', 'ai-search-pipeline', 'Embeddings, LLM completions, and instant typo-tolerant search engines.', 0)
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      [userIds.pro_builder, userIds.pro_builder]
    );

    const [proCols] = await conn.query('SELECT id, slug FROM collections WHERE user_id = ?', [
      userIds.pro_builder
    ]);
    for (const col of proCols) {
      if (col.slug === 'saas-fintech-stack') {
        for (const s of ['stripe-payments-billing-api', 'kigalipay-mobile-money-fx-api', 'auth0-universal-identity-api', 'resend-transactional-email-api']) {
          if (apiIdBySlug[s]) {
            await conn.query(
              'INSERT IGNORE INTO collection_apis (collection_id, api_id, notes) VALUES (?, ?, ?)',
              [col.id, apiIdBySlug[s], 'Production verified']
            );
          }
        }
      } else if (col.slug === 'ai-search-pipeline') {
        for (const s of ['openai-platform-api', 'meilisearch-instant-search-api']) {
          if (apiIdBySlug[s]) {
            await conn.query(
              'INSERT IGNORE INTO collection_apis (collection_id, api_id, notes) VALUES (?, ?, ?)',
              [col.id, apiIdBySlug[s], 'Hybrid RAG & search']
            );
          }
        }
      }
    }

    // 8. Seed Sponsored Campaign (1 Active Homepage Promotion + 1 Pending Review Paid Campaign)
    const [[homepagePkg]] = await conn.query(
      "SELECT id, price, duration_days FROM advertising_packages WHERE code = 'homepage_promotion' LIMIT 1"
    );
    const [[featuredPkg]] = await conn.query(
      "SELECT id, price, duration_days FROM advertising_packages WHERE code = 'featured_api' LIMIT 1"
    );

    const [existingCamp] = await conn.query(
      'SELECT id FROM sponsored_campaigns WHERE advertiser_user_id = ? LIMIT 1',
      [userIds.kigali_cloud]
    );

    if (existingCamp.length === 0 && homepagePkg && apiIdBySlug['kigalipay-mobile-money-fx-api']) {
      const [c1] = await conn.query(
        `INSERT INTO sponsored_campaigns (
          api_id, package_id, advertiser_user_id, provider_profile_id, target_category_id,
          title, headline, cta_label,
          payment_status, approval_status, campaign_status,
          reviewed_by, reviewed_at, starts_at, ends_at,
          impressions_count, clicks_count
        ) VALUES (
          ?, ?, ?, ?, ?,
          'KigaliPay v2 Launch Showcase',
          'Accept Mobile Money & settle in USD/RWF with 5-minute webhook integration. Free developer sandbox.',
          'View Docs & Sandbox',
          'paid', 'approved', 'active',
          ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY),
          184, 27
        )`,
        [
          apiIdBySlug['kigalipay-mobile-money-fx-api'],
          homepagePkg.id,
          userIds.kigali_cloud,
          verifiedProvider?.id || null,
          catMap['payments-fintech'],
          userIds.admin,
          homepagePkg.duration_days
        ]
      );

      await conn.query(
        `INSERT INTO payments (
          user_id, payment_for, campaign_id, payment_reference, provider,
          provider_transaction_id, amount, currency, status, metadata_json, paid_at
        ) VALUES (?, 'campaign', ?, 'PAY-CAM-SEED-001', 'seed_dev_verified', 'tx_seed_cam_01', ?, 'USD', 'succeeded', ?, UTC_TIMESTAMP())`,
        [
          userIds.kigali_cloud,
          c1.insertId,
          homepagePkg.price,
          JSON.stringify({ seed_note: 'Development seed sponsored campaign payment' })
        ]
      );

      if (featuredPkg && apiIdBySlug['kigalipulse-instant-sms-otp-api']) {
        const [c2] = await conn.query(
          `INSERT INTO sponsored_campaigns (
            api_id, package_id, advertiser_user_id, provider_profile_id, target_category_id,
            title, headline, cta_label,
            payment_status, approval_status, campaign_status
          ) VALUES (
            ?, ?, ?, ?, ?,
            'KigaliPulse OTP Featured Week',
            'Deliver 2FA SMS codes in under 3 seconds across 40+ countries.',
            'Try 50 Free SMS',
            'paid', 'pending', 'pending_review'
          )`,
          [
            apiIdBySlug['kigalipulse-instant-sms-otp-api'],
            featuredPkg.id,
            userIds.kigali_cloud,
            verifiedProvider?.id || null,
            catMap['communication-messaging']
          ]
        );

        await conn.query(
          `INSERT INTO payments (
            user_id, payment_for, campaign_id, payment_reference, provider,
            provider_transaction_id, amount, currency, status, metadata_json, paid_at
          ) VALUES (?, 'campaign', ?, 'PAY-CAM-SEED-002', 'seed_dev_verified', 'tx_seed_cam_02', ?, 'USD', 'succeeded', ?, UTC_TIMESTAMP())`,
          [
            userIds.kigali_cloud,
            c2.insertId,
            featuredPkg.price,
            JSON.stringify({ seed_note: 'Development seed pending-moderation campaign' })
          ]
        );
      }
    }

    // 9. Seed Sample Report for Admin Moderation Queue
    const [existingReports] = await conn.query('SELECT id FROM api_reports LIMIT 1');
    if (existingReports.length === 0 && apiIdBySlug['cloudinary-programmable-media-api']) {
      await conn.query(
        `INSERT INTO api_reports (api_id, reporter_user_id, reason, details, status)
         VALUES (?, ?, 'incorrect_info', 'Cloudinary also supports OAuth tokens for enterprise accounts in addition to HTTP Basic Auth.', 'open')`,
        [apiIdBySlug['cloudinary-programmable-media-api'], userIds.student_dev]
      );
    }
  });

  console.log('[Seed] Development dataset seeded successfully!');
  console.log('  Test Accounts (all marked for local development only):');
  console.log('    - Admin:    admin@apilocate.dev     / Admin123!');
  console.log('    - Provider: provider@apilocate.dev  / Developer123!');
  console.log('    - Premium:  premium@apilocate.dev   / Developer123!');
  console.log('    - Free Dev: developer@apilocate.dev / Developer123!');
}

if (require.main === module) {
  seedDevelopmentData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error:', err);
      process.exit(1);
    });
}

module.exports = { seedDevelopmentData };
