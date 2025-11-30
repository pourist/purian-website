
# Purian Landing Page

Early-stage web presence for the Purian brand.
Static site deployed on Vercel with serverless APIs, Supabase integration, and transactional email support.

## Overview

The Purian website is a lightweight, static landing page designed to introduce the brand, collect early-stage waitlist signups, and validate demand before product launch. The system is intentionally minimal but structured to scale into a full production architecture as the brand grows.

## Tech Stack

### Frontend

* **HTML / CSS / Vanilla JS**
  Lightweight, framework-free static site optimized for fast delivery and easy iteration in early development.
* **Vercel**
  Used as the hosting and deployment platform.
  Handles:

  * automatic builds from GitHub
  * global CDN
  * SSL certificates
  * routing
  * serverless API functions

### Backend

* **Serverless Functions (Vercel Functions)**
  Located under `/api/subscribe.js`
  Purpose:

  * accept POST requests from the landing page
  * validate and insert email addresses into Supabase
  * send automated confirmation emails through Resend

### Database

* **Supabase**

  * PostgreSQL database
  * Table: `waitlist`
  * Fields: `email`, `timestamp`
  * RLS-enabled table with an `INSERT` policy for `anon`
  * Supabase keys stored as environment variables in Vercel (not exposed client-side)

### Email Infrastructure

* **Netcup Webhosting (Email Only)**
  Used for:

  * brand-aligned email addresses (support@, no-reply@, pouriya@, deniz@)
  * IMAP/SMTP mailboxes
  * DNS (MX, SPF, DKIM, DMARC)

* **Resend API**
  Used for sending transactional emails from the serverless API.

  * Domain: purian.eu
  * DKIM-verified
  * “Enable Sending” validated via SPF
  * No “Enable Receiving” configured (Netcup handles receiving)

### DNS Configuration

* Domains: `purian.eu` and `puriansoap.de`
* Provider: Netcup DNS
* Configuration:

  * A record for root (`@`) → Vercel (216.198.79.1)
  * CNAME for `www` → Vercel DNS hostname
  * Netcup MX, SPF, DKIM, DMARC for email
  * Wildcard records removed to prevent SSL and routing conflicts
  * SPF extended to include Resend:

    ```
    v=spf1 mx a include:_spf.webhosting.systems include:spf.resend.com ~all
    ```

---

## Repository Structure

```
/
├── index.html            # Landing page markup
├── style.css             # Styling for the website
├── app.js                # Frontend logic (fetch call to API)
├── translations.js       # Simple EN/DE language toggle system
├── assets/
│   └── hero.jpg          # Hero image used in the landing layout
├── api/
│   └── subscribe.js      # Serverless API for Supabase + Resend
└── README.md
```

### Key Files

#### `api/subscribe.js`

Implements:

* JSON POST parsing
* input validation
* insertion into `waitlist` table
* transactional email via Resend
* success / failure responses

#### `app.js`

Handles:

* capturing the submitted email
* calling the API route
* showing success/errors to the user
* language switching (DE / EN)

---

## Deployment & Environments

* Production deploys automatically from the `main` branch.
* Development deploys from feature branches via Vercel preview deployments.
* Environment variables are configured in Vercel (Preview + Production).

**Environment variables used:**

```
SUPABASE_URL
SUPABASE_ANON_KEY
RESEND_API_KEY
```

---

## Operational Notes

* Email inboxes (s****, no***y ..) are managed entirely through Netcup Plesk.
* SSL issuance for root domains required deleting wildcard records and confirming domain existence in Vercel.
* Supabase RLS policy: one permissive INSERT policy for `anon` to allow serverless write access.
* Resend is used only for sending; all receiving stays at Netcup.

---

## Current Scope

The site currently serves as a simple, high-performance waitlist landing page with:

* hero section
* brand introduction
* EN/DE language toggle
* email submission form
* automatic confirmation emails
* secured domain configuration
* stable backend integration

---

## Next Steps (Technical)

* Add analytics (Vercel Analytics or Plausible)
* Improve form UX and error handling
* Add additional content sections (About, Values, Ingredients, etc.)
* Begin modularizing the codebase for future scaling (e.g., switching to a framework when needed)

---
