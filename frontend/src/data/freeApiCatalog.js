const starterTags = (names) => names.map((name, index) => ({ id: index + 1, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));

// Public, no-key APIs used as a clearly-labelled local preview when the API Locate
// backend has not been configured yet. These entries are never written to a DB.
export const FREE_API_CATALOG = [
  {
    id: -101,
    name: 'Open-Meteo Weather API',
    slug: 'open-meteo-weather-api',
    provider_name: 'Open-Meteo',
    provider_website_url: 'https://open-meteo.com',
    category_name: 'Weather & Environment',
    category_slug: 'weather-environment',
    short_description: 'Free global weather forecasts and historical weather data with no API key required for non-commercial use.',
    full_description: 'Open-Meteo provides global weather forecasts, historical weather data, and climate information through a simple JSON API. No API key is required for non-commercial use. Check the provider terms for usage limits and commercial licensing.',
    base_url: 'https://api.open-meteo.com/v1',
    docs_url: 'https://open-meteo.com/en/docs',
    website_url: 'https://open-meteo.com',
    auth_type: 'none',
    auth_details: 'No API key required for non-commercial use.',
    pricing_model: 'free',
    pricing_details: 'Free for non-commercial use; consult provider terms for commercial use and limits.',
    rate_limit_info: 'Usage limits apply. See official documentation for current terms.',
    https_supported: 1,
    cors_supported: 'yes',
    verification_level: 'unverified',
    operational_status: 'unknown',
    source_type: 'preview',
    is_seed_data: 1,
    is_demo: true,
    tags: starterTags(['weather', 'forecast', 'no-auth', 'free-api']),
    endpoints: [{ id: 'weather-forecast', http_method: 'GET', path: '/forecast?latitude=-1.94&longitude=30.06&current=temperature_2m', summary: 'Get the current weather forecast for Kigali', description: 'Replace the latitude and longitude with the location you want to forecast.', auth_required: 0, sample_request: 'GET https://api.open-meteo.com/v1/forecast?latitude=-1.94&longitude=30.06&current=temperature_2m', sample_response: '{\n  "current": { "temperature_2m": 24.1, "time": "2026-11-24T12:00" }\n}' }]
  },
  {
    id: -102,
    name: 'REST Countries API',
    slug: 'rest-countries-api',
    provider_name: 'REST Countries Community',
    provider_website_url: 'https://restcountries.com',
    category_name: 'Open Data & Education',
    category_slug: 'open-data-education',
    short_description: 'Look up country names, capitals, currencies, languages, flags, and population from a public REST API.',
    full_description: 'REST Countries provides country information in JSON, including names, capitals, currencies, languages, flags, and regional metadata. No API key is required. Review the project documentation for current rate limits and field selection.',
    base_url: 'https://restcountries.com/v3.1',
    docs_url: 'https://restcountries.com',
    website_url: 'https://restcountries.com',
    auth_type: 'none',
    auth_details: 'No API key required.',
    pricing_model: 'free',
    pricing_details: 'Free public service. Use responsibly and check the project documentation for limits.',
    rate_limit_info: 'Community service; avoid excessive request rates.',
    https_supported: 1,
    cors_supported: 'yes',
    verification_level: 'unverified',
    operational_status: 'unknown',
    source_type: 'preview',
    is_seed_data: 1,
    is_demo: true,
    tags: starterTags(['countries', 'open-data', 'no-auth', 'free-api']),
    endpoints: [{ id: 'country-name', http_method: 'GET', path: '/name/rwanda?fields=name,capital,currencies,languages', summary: 'Find country details by name', description: 'Returns matching countries and the requested fields.', auth_required: 0, sample_request: 'GET https://restcountries.com/v3.1/name/rwanda?fields=name,capital,currencies,languages', sample_response: '[{\n  "name": { "common": "Rwanda" },\n  "capital": ["Kigali"],\n  "region": "Africa"\n}]' }]
  },
  {
    id: -103,
    name: 'JSONPlaceholder API',
    slug: 'jsonplaceholder-api',
    provider_name: 'JSONPlaceholder',
    provider_website_url: 'https://jsonplaceholder.typicode.com',
    category_name: 'Developer Tools & Utilities',
    category_slug: 'developer-tools',
    short_description: 'A free fake REST API for prototyping and learning with posts, users, albums, comments, and todos.',
    full_description: 'JSONPlaceholder is a lightweight mock REST API for tutorials, prototypes, and frontend development. It offers sample resources such as posts, comments, albums, photos, todos, and users without an API key.',
    base_url: 'https://jsonplaceholder.typicode.com',
    docs_url: 'https://jsonplaceholder.typicode.com/guide/',
    website_url: 'https://jsonplaceholder.typicode.com',
    auth_type: 'none',
    auth_details: 'No API key required.',
    pricing_model: 'free',
    pricing_details: 'Free public testing service.',
    rate_limit_info: 'Intended for demos and learning; not a production data backend.',
    https_supported: 1,
    cors_supported: 'yes',
    verification_level: 'unverified',
    operational_status: 'unknown',
    source_type: 'preview',
    is_seed_data: 1,
    is_demo: true,
    tags: starterTags(['testing', 'mock-data', 'rest', 'no-auth']),
    endpoints: [{ id: 'sample-post', http_method: 'GET', path: '/posts/1', summary: 'Fetch a sample post', description: 'Returns a fixture post for trying out fetch clients and UI states.', auth_required: 0, sample_request: 'GET https://jsonplaceholder.typicode.com/posts/1', sample_response: '{\n  "userId": 1,\n  "id": 1,\n  "title": "sunt aut facere repellat provident",\n  "body": "quia et suscipit..."\n}' }]
  },
  {
    id: -104,
    name: 'PokeAPI',
    slug: 'pokeapi',
    provider_name: 'PokeAPI Community',
    provider_website_url: 'https://pokeapi.co',
    category_name: 'Open Data & Education',
    category_slug: 'open-data-education',
    short_description: 'Explore Pokémon game data, species, abilities, items, and moves through a free public REST API.',
    full_description: 'PokeAPI is a community-maintained RESTful API for Pokémon-related game data. It is useful for learning API integration and building fan projects. No API key is required; follow the published usage policy and attribution guidance.',
    base_url: 'https://pokeapi.co/api/v2',
    docs_url: 'https://pokeapi.co/docs/v2',
    website_url: 'https://pokeapi.co',
    auth_type: 'none',
    auth_details: 'No API key required.',
    pricing_model: 'free',
    pricing_details: 'Free community service; consult the official usage policy before production use.',
    rate_limit_info: 'Respect the service usage policy and cache responses where practical.',
    https_supported: 1,
    cors_supported: 'yes',
    verification_level: 'unverified',
    operational_status: 'unknown',
    source_type: 'preview',
    is_seed_data: 1,
    is_demo: true,
    tags: starterTags(['education', 'games', 'rest', 'no-auth']),
    endpoints: [{ id: 'pokemon', http_method: 'GET', path: '/pokemon/pikachu', summary: 'Get Pokémon data by name', description: 'Returns a Pokémon resource and its game data.', auth_required: 0, sample_request: 'GET https://pokeapi.co/api/v2/pokemon/pikachu', sample_response: '{\n  "name": "pikachu",\n  "base_experience": 112,\n  "height": 4\n}' }]
  },
  {
    id: -105,
    name: 'Frankfurter Exchange Rates API',
    slug: 'frankfurter-exchange-rates-api',
    provider_name: 'Frankfurter',
    provider_website_url: 'https://frankfurter.dev',
    category_name: 'Payments & FinTech',
    category_slug: 'payments-fintech',
    short_description: 'Free foreign-exchange reference rates based on data from central banks, with no API key required.',
    full_description: 'Frankfurter exposes foreign-exchange reference rates from central banks in a simple HTTP API. No API key is required. Rates are informational and should not be treated as guaranteed executable trading prices.',
    base_url: 'https://api.frankfurter.dev/v1',
    docs_url: 'https://frankfurter.dev',
    website_url: 'https://frankfurter.dev',
    auth_type: 'none',
    auth_details: 'No API key required.',
    pricing_model: 'free',
    pricing_details: 'Free public reference-rate service.',
    rate_limit_info: 'See provider documentation; avoid abusive request patterns.',
    https_supported: 1,
    cors_supported: 'yes',
    verification_level: 'unverified',
    operational_status: 'unknown',
    source_type: 'preview',
    is_seed_data: 1,
    is_demo: true,
    tags: starterTags(['exchange-rates', 'currency', 'finance', 'no-auth']),
    endpoints: [{ id: 'exchange-rates', http_method: 'GET', path: '/latest?base=USD&symbols=EUR,RWF', summary: 'Get recent USD exchange rates', description: 'Returns available reference rates for the requested currencies.', auth_required: 0, sample_request: 'GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,RWF', sample_response: '{\n  "base": "USD",\n  "date": "2026-11-23",\n  "rates": { "EUR": 0.86, "RWF": 1450.0 }\n}' }]
  },
  {
    id: -106,
    name: 'Open Library Books API',
    slug: 'open-library-books-api',
    provider_name: 'Internet Archive · Open Library',
    provider_website_url: 'https://openlibrary.org',
    category_name: 'Open Data & Education',
    category_slug: 'open-data-education',
    short_description: 'Search a public catalog of books, authors, editions, and subjects with open endpoints.',
    full_description: 'Open Library is an open, community-editable book catalog maintained by the Internet Archive. Its APIs support book search, work and edition lookups, and cover images. No API key is needed for common read-only catalog requests; use the service politely and review its API guidelines.',
    base_url: 'https://openlibrary.org',
    docs_url: 'https://openlibrary.org/developers/api',
    website_url: 'https://openlibrary.org',
    auth_type: 'none',
    auth_details: 'No API key required for public catalog reads.',
    pricing_model: 'free',
    pricing_details: 'Free public catalog access; review service usage guidelines.',
    rate_limit_info: 'Be considerate; identify your application where recommended by the provider.',
    https_supported: 1,
    cors_supported: 'yes',
    verification_level: 'unverified',
    operational_status: 'unknown',
    source_type: 'preview',
    is_seed_data: 1,
    is_demo: true,
    tags: starterTags(['books', 'education', 'open-data', 'no-auth']),
    endpoints: [{ id: 'book-search', http_method: 'GET', path: '/search.json?q=Kigali&limit=5', summary: 'Search book records', description: 'Searches the public catalog and returns matching works and editions.', auth_required: 0, sample_request: 'GET https://openlibrary.org/search.json?q=Kigali&limit=5', sample_response: '{\n  "numFound": 2,\n  "docs": [{ "title": "Rwanda: The Bradt Travel Guide" }]\n}' }]
  }
];

export const FREE_API_TAGS = [...new Map(FREE_API_CATALOG.flatMap((api) => api.tags).map((tag) => [tag.slug, tag])).values()];

export const FREE_API_CATEGORIES = [...new Map(FREE_API_CATALOG.map((api) => [api.category_slug, {
  id: api.category_slug,
  slug: api.category_slug,
  name: api.category_name,
  description: `Free public APIs for ${api.category_name.toLowerCase()}.`,
  api_count: FREE_API_CATALOG.filter((item) => item.category_slug === api.category_slug).length
}])).values()];

export function findFreeApi(slug) {
  return FREE_API_CATALOG.find((api) => api.slug === String(slug)) || null;
}

export function searchFreeApis(filters = {}) {
  let results = FREE_API_CATALOG.filter((api) => {
    const q = String(filters.q || '').trim().toLowerCase();
    const matchesQ = !q || `${api.name} ${api.provider_name} ${api.short_description} ${api.tags.map((tag) => tag.name).join(' ')}`.toLowerCase().includes(q);
    const matchesCategory = !filters.category || filters.category === api.category_slug;
    const matchesPricing = !filters.pricing || filters.pricing === 'free_or_freemium' || filters.pricing === 'free';
    const matchesAuth = !filters.auth_type || filters.auth_type === 'none';
    const matchesProvider = !filters.provider || api.provider_name.toLowerCase().includes(String(filters.provider).toLowerCase());
    const matchesTag = !filters.tag || api.tags.some((tag) => tag.slug === filters.tag);
    return matchesQ && matchesCategory && matchesPricing && matchesAuth && matchesProvider && matchesTag;
  });
  if (filters.sort === 'alphabetical') results = [...results].sort((a, b) => a.name.localeCompare(b.name));
  return results;
}
