export const AUTH_LABELS = {
  none: 'No Auth',
  api_key: 'API Key',
  oauth2: 'OAuth 2.0',
  basic: 'Basic Auth',
  bearer: 'Bearer Token',
  custom: 'Custom Auth',
  unknown: 'Unknown Auth'
};

export const PRICING_LABELS = {
  free: 'Free',
  freemium: 'Freemium',
  paid: 'Paid',
  contact: 'Contact Provider',
  unknown: 'Unknown'
};

export const VERIFICATION_LABELS = {
  verified: 'Verified Spec',
  community_reviewed: 'Community Reviewed',
  unverified: 'Unverified',
  incomplete: 'Incomplete Info'
};

export const REPORT_REASON_LABELS = {
  broken_docs: 'Broken Documentation Link',
  incorrect_info: 'Incorrect API Information',
  security_concern: 'Security Concern',
  duplicate_listing: 'Duplicate Listing',
  other: 'Other Problem'
};

export function formatPricingBadgeClass(pricing) {
  switch (pricing) {
    case 'free':
      return 'badge-free';
    case 'freemium':
      return 'badge-freemium';
    case 'paid':
      return 'badge-paid';
    case 'contact':
      return 'badge-contact';
    default:
      return 'badge-neutral';
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatCurrency(amount, currency = 'USD') {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(num);
}

export function getInitials(name) {
  return String(name || 'API')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
