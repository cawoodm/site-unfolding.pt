# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static export of the **unfolding.pt** website ("Unfolding Portugal", a personal retreat in the Algarve), built with the Sitejet website builder. All content lives in `old/`. Vite is used only as a local static dev server; there is no build step, tests, linter, or git repository.

Content is bilingual: English (`old/en/`) and German (`old/de/`). Each page is a single generated `index.html` in its own folder (`en/`, `en/subpage/`, `en/privacy/`, `en/legal-notice/`, `de/`, `de/datenschutz/`, `de/impressum/`). `old/sitemap.xml` lists the public URLs.

## Running locally

```
npm install
npm run dev        # Vite on http://localhost:8000, serving old/ as the site root
```

`vite.config.js` sets `root: 'old'`, `appType: 'mpa'` (no SPA fallback) and a small middleware that 301-redirects folder URLs without a trailing slash (`/en` → `/en/`), because the pages link that way. Vite does not run PHP, so `api.php` (forms) does not work there. For forms, use `php -S localhost:8000 -t old`.

`old/index.html` is a static landing page with EN | DE links that redirects to `/en/` after 10 s (meta refresh). On a PHP host, `old/index.php` does an `Accept-Language` redirect instead; which one `/` serves depends on the server's directory-index order.

## Architecture

- `old/index.php` — PHP root entry point. Reads `Accept-Language` and sends a 302 to `/de/` or `/en/` (default `en`).
- `old/api.php` — Sitejet API proxy (must stay PHP 7.1 compatible). The pages set `webcard.apiHost = location.host + '/api.php'`, so all builder API calls go through it. It handles contact-form submissions (email, CSV, webhook, Cloudflare Turnstile captcha) and forwards the rest to `https://api.sitehub.io`, and `/images` requests to `https://inter-cdn.com`. It is vendor code; avoid editing it.
- `old/webcard/` — Sitejet runtime (`app.bundle.*.js`, `app.min.*.css`, chunks, slick slider). Vendor code, minified.
- `old/css/custom.*.css` and `old/js/custom.*.js` — site-level custom styles and the "Menu V2" preset JS (jQuery: menu toggle, smooth scroll, sticky header). The numeric suffix is a cache-busting timestamp referenced from every HTML page; if you rename a file, update all references.
- `old/g/` — self-hosted Google Fonts (Lato, Playfair Display) served via `fonts.css`.
- `old/images/<size>/<id>/<name>` — responsive image variants. `<size>` is the width (48, 576, 976, 1024, 1920 …), sometimes with a crop suffix (`1024_600x599_0_100`). The same `<id>` appears under several sizes; pages pick variants via inline `@media` rules and `srcset`.
- `old/bundles/flag-icon-css/` — flag SVGs for the language switcher.

## Editing pages

- HTML is generated, minified onto few lines, and full of element IDs like `#ed-4042029659`. Page-specific styles sit in an inline `<style>` block in `<head>` keyed by those IDs. Edit text in place; keep IDs and class names intact because the runtime and CSS depend on them.
- EN and DE pages are separate copies. A content or layout change usually has to be applied to both languages.
- Contact details (WhatsApp, phone, email, Instagram, Facebook) are hard-coded in each page.
- The English home page links to `/legal-notice` and `/privacy` (root-relative, no `/en/` prefix), while the files live at `/en/legal-notice/` and `/en/privacy/`. Check these links when touching navigation.
