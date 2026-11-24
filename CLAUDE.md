# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static website for **unfolding.pt** ("Unfolding Portugal", a personal retreat in the Algarve), hosted on GitHub Pages from `cawoodm/site-unfolding.pt`. The site is being rebuilt as plain static HTML with Tailwind CSS and vanilla JS, without the Sitejet builder or its libraries. The spec is `docs/CONCEPT.md`; the implementation plan is in `docs/plans/`.

The original Sitejet export is the content source and stays local in `old/` (git-ignored, not published).

## Target site

- Bilingual: English (`www/en/`) and German (`www/de/`). Each page lives in its own folder as `index.html`: home, legal notice / Impressum, privacy / Datenschutz. `www/index.html` redirects at once: to `de/` if the browser ranks German above English in `navigator.languages`, otherwise to `en/` (also without JS); its EN/DE links are only a fallback.
- No server-side code and no PHP. No contact form: contact is WhatsApp and email links only.
- No backend, no cookies, no analytics. The privacy policy must say so; keep it accurate when adding anything that loads third-party content or collects data.
- Styling with Tailwind; site theme colors are primary `#4e6e54`, secondary `#d27d6b`, background `#f8f4e3`, text `#3d3d3d`; fonts Lato (body) and Playfair Display (headings), self-hosted.
- JS is vanilla only (menu toggle, active-section highlight). No jQuery or other runtime libraries.
- EN and DE pages are separate files. Apply content and layout changes to both.

## Commands

```
npm install
npm run dev        # Vite dev server on http://localhost:8000, www/ as root
npm run build      # build www/ into dist/
npm test           # build, then node:test checks in tests/site.test.js
node --test --test-name-pattern="resolves" tests/site.test.js   # single test (needs a build)
```

`vite.config.js` builds every `index.html` under `www/` as a page, runs Tailwind via `@tailwindcss/vite`, and uses `base: './'` so assets are referenced relatively. It also redirects folder URLs without a trailing slash (`/en` to `/en/`) in dev, like GitHub Pages does.

## Structure

- `www/css/site.css`: Tailwind import, self-hosted `@font-face` rules, theme tokens (`primary`, `secondary`, `sand`, `ink`, `mist`, `font-sans`, `font-serif`), the `.legal` text styles and the hero `.rise` animation.
- `www/js/main.js`: mobile menu (`data-menu-toggle` / `data-menu`) and `aria-current` on the menu link of the visible section.
- `www/images/`, `www/fonts/`: processed by Vite (hashed into `dist/assets/`). `www/public/` is copied as-is to the site root (`sitemap.xml`, `robots.txt`).
- All internal links and asset references are relative (never start with `/`), so the site works on `unfolding.pt` and under `cawoodm.github.io/site-unfolding.pt/`. `npm test` enforces this and checks that every reference resolves.

## Deployment

`.github/workflows/pages.yml` runs `npm ci` and `npm test`, then deploys `dist/` to GitHub Pages on every push to `main` (also runnable manually). It has a `build` job that uploads the Pages artifact and a separate `deploy` job; keep them split, because `deploy-pages` cannot find an artifact uploaded in the same job. Live preview: https://cawoodm.github.io/site-unfolding.pt/. The plan moves the domain `unfolding.pt` to GitHub Pages at the end (`www/public/CNAME` plus DNS change).

Commits use English messages and no AI attribution.
