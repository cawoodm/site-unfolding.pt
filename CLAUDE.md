# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static website for **unfolding.pt** ("Unfolding Portugal", a personal retreat in the Algarve), hosted on GitHub Pages from `cawoodm/site-unfolding.pt`. The site is being rebuilt as plain static HTML with Tailwind CSS and vanilla JS, without the Sitejet builder or its libraries. The spec is `docs/CONCEPT.md`. Plans and working notes live locally in `tmp/plans/` (git-ignored).

The original Sitejet export is the content source and stays local in `old/` (git-ignored, not published).

## Target site

- Bilingual: English and German. The home pages are generated: `templates/home.html` is rendered per language by `scripts/build-content.mjs` from `content/<lang>/*.md` (blocks, `##HERO##` → `hero.md`, `##SERVICES:items##` → one `<li>` per `###` section) and `content/<lang>/site.yml` (escaped strings, `##MENU_HOME##` → `menu_home`) into `www/<lang>/index.html` (git-ignored; edit the template or content, never the output). Legal pages under `www/<lang>/…/index.html` are hand-written. `www/index.html` redirects at once: to `de/` if the browser ranks German above English in `navigator.languages`, otherwise to `en/` (also without JS); its EN/DE links are only a fallback.
- No server-side code and no PHP. No contact form: contact is WhatsApp and email links only.
- No backend, no cookies, no analytics. The privacy policy must say so; keep it accurate when adding anything that loads third-party content or collects data.
- Styling with Tailwind; site theme colors are primary `#4e6e54`, secondary `#d27d6b`, background `#f8f4e3`, text `#3d3d3d`; fonts Lato (body) and Playfair Display (headings), self-hosted.
- JS is vanilla only (menu toggle, active-section highlight). No jQuery or other runtime libraries.
- Layout changes go into `templates/home.html` (both languages); text changes into `content/en/` and `content/de/`. The build fails on a placeholder without content or content without a placeholder. Rendered Markdown has no classes; style it through the `.md-*` component classes in `site.css`.

## Commands

```
npm install
npm run dev        # Vite dev server on http://localhost:8000, www/ as root
npm run build      # build www/ into dist/
npm test           # build, then run tests/site.test.js and tests/content.test.js
npm run content    # render content/ into www/<lang>/index.html without building
node --test --test-name-pattern="resolves" tests/site.test.js   # single test (needs a build)
```

`vite.config.js` builds every `index.html` under `www/` as a page, runs Tailwind via `@tailwindcss/vite`, and uses `base: './'` so assets are referenced relatively. It also redirects folder URLs without a trailing slash (`/en` to `/en/`) in dev, like GitHub Pages does.

## Structure

- `www/css/site.css`: Tailwind import, self-hosted `@font-face` rules, theme tokens (`primary`, `secondary`, `sand`, `ink`, `mist`, `font-sans`, `font-serif`), the `.legal` text styles and the hero `.rise` animation.
- `www/js/main.js`: mobile menu (`data-menu-toggle` / `data-menu`) and `aria-current` on the menu link of the visible section.
- `templates/home.html`: the single home-page template. Placeholders `##KEY##`, `##KEY:items##`, built-ins `##LANG##`, `##CANONICAL##`, `##ALTERNATES##`, `##LANG_SWITCH##`.
- `content/<lang>/`: Markdown blocks and `site.yml` strings; `content/README.md` is the editor guide.
- `scripts/build-content.mjs`: the renderer; also called from `vite.config.js` at startup and on change in dev. `site.css` uses `@source` for `templates/` and `scripts/` because the generated pages are git-ignored.
- `www/images/`, `www/fonts/`: processed by Vite (hashed into `dist/assets/`). `www/public/` is copied as-is to the site root (`sitemap.xml`, `robots.txt`).
- All internal links and asset references are relative (never start with `/`), so the site works on `unfolding.pt` and under `cawoodm.github.io/site-unfolding.pt/`. `npm test` enforces this and checks that every reference resolves.

## Deployment

`.github/workflows/pages.yml` runs `npm ci` and `npm test`, then deploys `dist/` to GitHub Pages on every push to `main` that touches `content/`, `templates/`, `www/` (incl. images), `scripts/` or the build config (also runnable manually). It has a `build` job that uploads the Pages artifact and a separate `deploy` job; keep them split, because `deploy-pages` cannot find an artifact uploaded in the same job. Live preview: https://cawoodm.github.io/site-unfolding.pt/. The plan moves the domain `unfolding.pt` to GitHub Pages at the end (`www/public/CNAME` plus DNS change).

Commits use English messages and no AI attribution.
