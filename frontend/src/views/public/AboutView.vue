<template>
  <div class="container page-section" style="max-width: 960px;">
    <div class="page-header">
      <div>
        <span class="eyebrow">Our Mission &amp; Governance</span>
        <h1 class="page-title" style="margin-top: 0.15rem;">
          Built for Clarity, <span class="serif-italic" style="font-size: 1.08em;">Engineered for Trust</span>
        </h1>
        <p class="page-subtitle">Discover APIs. Organize Resources. Build More.</p>
      </div>
    </div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <h2>Why API Locate Exists</h2>
      <p>
        Developers often spend hours sifting through outdated blog posts, dead endpoints, and vague
        pricing pages before finding a reliable API. API Locate solves that discovery bottleneck by
        combining moderated technical documentation, MySQL full-text search, personal resource
        collections, and side-by-side feature comparison in one unified workspace.
      </p>
      <p style="margin: 0;">
        Whether you are a beginner student building your first weather dashboard, a startup
        integrating mobile money payments, or an API provider launching developer tools, API Locate
        is built around clarity, accuracy, and trust.
      </p>
    </div>

    <div class="grid-2" style="margin-bottom: 1.5rem;">
      <div class="card">
        <h3>Three Verified Data Channels</h3>
        <p>
          <strong>1. Administrator Curations:</strong> Verified specifications with reviewed base
          URLs, auth mechanisms, and endpoint payload samples.
        </p>
        <p>
          <strong>2. Community Submissions:</strong> Submitted by developers and held in a
          moderation queue until an administrator verifies documentation links.
        </p>
        <p style="margin: 0;">
          <strong>3. Permitted Repository Imports:</strong> Synchronized from official OpenAPI feeds
          with automatic deduplication, license preservation, and source attribution.
        </p>
      </div>

      <div class="card">
        <h3>Ethical Sponsored Advertising</h3>
        <p>
          API Locate allows API owners and verified providers to promote approved listings through
          configurable packages—while protecting developer trust:
        </p>
        <ul style="padding-left: 1.2rem; color: var(--text-secondary); font-size: 0.9rem; margin: 0;">
          <li>Sponsored listings always carry an explicit <strong>Sponsored</strong> badge.</li>
          <li>Organic search relevance is never altered by advertising spend.</li>
          <li>Every campaign is moderated by an administrator before going live.</li>
        </ul>
      </div>
    </div>

    <div class="card flex-between">
      <div>
        <h3 style="margin-bottom: 0.2rem;">Ready to contribute or promote an API?</h3>
        <p style="margin: 0; font-size: 0.9rem;">Create a free account in seconds or reach out to our team.</p>
      </div>
      <div class="flex-row">
        <router-link to="/explore" class="btn btn-secondary">Browse Directory</router-link>
        <router-link to="/contact" class="btn btn-primary">Contact Team</router-link>
      </div>
    </div>
  </div>
</template>
