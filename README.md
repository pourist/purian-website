# Purian Landing Page

Lightweight static website for the Purian brand.
Deployed on Vercel with serverless APIs, Supabase waitlist storage, transactional email handling, and full search engine indexing setup.

---

## Overview

The site introduces the brand, collects early-stage waitlist signups, and establishes the foundational technical and SEO infrastructure for future growth.
The codebase is intentionally minimal and fast, with clear paths for expansion.

---

## Tech Stack

### Frontend

* **HTML / CSS / Vanilla JS**
  Compact, framework-free frontend optimized for quick loads and simple iteration.
* **Vercel (Hosting)**
  Builds from GitHub, global CDN, SSL, routing, and project-level domain management.

### Backend

* **Vercel Serverless Functions** (`/api/subscribe.js`)

  * Validate POSTed email input
  * Insert into Supabase table
  * Send confirmation emails via Resend
  * Return structured JSON responses

### Database

* **Supabase (PostgreSQL)**

  * Table: `waitlist (email, timestamp)`
  * RLS: permissive INSERT for serverless function
  * Keys stored in Vercel environment variables

### Email

* **Netcup Webhosting**

  * IMAP/SMTP mailboxes
  * MX, SPF, DKIM, DMARC
* **Resend API**

  * Transactional email sending
  * Domain authenticated (DKIM + SPF)

---

## Domains & DNS

**Primary domain:** `purian.eu`
**Secondary domain:** `puriansoap.de` → permanently redirected (301) to `purian.eu`

**DNS provider:** Netcup

Active configuration:

* A record (`@`) → Vercel
* CNAME (`www`) → Vercel DNS
* MX/SPF/DKIM/DMARC for Netcup email
* Resend SPF included
* Wildcards removed (SSL conflict avoidance)

This setup consolidates domain authority and ensures consistent SEO signals.

---

## SEO Foundation

Included in the project:

* `robots.txt`
* `sitemap.xml` (submitted to Google and Bing)
* canonical URL (`https://purian.eu/`)
* optimized `<head>` metadata
* Open Graph + Twitter cards
* structured heading hierarchy with accessible enhancements
* optimized EN/DE copy via `translations.js`

**Search Console:** Domain verified
**Bing Webmaster Tools:** Connected (via GSC import)

---

## Analytics

**Vercel Analytics** enabled for traffic monitoring.

---

## Repository Structure

```
/
├── index.html            # SEO-optimized landing page markup
├── style.css             # Styling
├── app.js                # Form logic, API calls, language switching
├── translations.js       # EN/DE translation system
├── robots.txt            # Crawl permissions
├── sitemap.xml           # Sitemap for search engines
├── assets/
│   ├── hero.jpg
│   └── favicon.png
├── api/
│   └── subscribe.js      # Serverless API for Supabase + Resend
└── README.md
```

---

## Deployment & Environments

* Production deploys from `main`
* Preview deploys from feature branches
* Environment variables in Vercel:

```
SUPABASE_URL
SUPABASE_ANON_KEY
RESEND_API_KEY
```

---

## Current Scope

* Hero section with SEO-optimized `<h1>`
* EN/DE dynamic translation system
* Email signup with backend integration
* Confirmation email automation
* Fully configured domains and redirects
* Search engine indexing enabled
* Analytics active

---

## Future Enhancements

* Improved form UX
* Additional informational sections
* Optional analytics upgrade (Plausible)
* Structured data (JSON-LD)
* Migration to framework when scaling

---
