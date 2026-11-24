# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static website for **unfolding.pt** ("Unfolding Portugal", a personal retreat in the Algarve), hosted on GitHub Pages from `cawoodm/site-unfolding.pt`. The site is being rebuilt as plain static HTML with Tailwind CSS and vanilla JS, without the Sitejet builder or its libraries. The spec is `docs/CONCEPT.md`. Plans and working notes live locally in `tmp/plans/` (git-ignored).

The original Sitejet export is the content source and stays local in `old/` (git-ignored, not published).

## Target site

- Bilingual, single page per language: English and German. There is one template, `www/index.html`. `scripts/build-content.mjs` renders it per language from `content/<lang>/*.md` (blocks) and `content/<lang>/site.yml` (strings). Nothing generated is written into `www/`; the output exists only in `dist/` (build) or in memory (dev). There are no other navigable pages: the legal notice (`LEGAL-NOTICE.md`) and the privacy policy (`PRIVACY.md`) are `<dialog>` elements at the end of the template, opened by the footer links `#legal-notice` / `#privacy` (and deep links like `/en/#privacy`). The removed folders `templates/`, `www/en/`, `www/de/` must not come back.
- Placeholders in `www/index.html`: `##NAME.md##` is `content/<lang>/NAME.md` (exact, case-sensitive file name, rendered with `marked`); `##NAME.md:items##` splits the file at `### ` headings into one `<li>` each; `##lowercase_key##` is the HTML-escaped `site.yml` string (keys match `^[a-z0-9_]+$`); `##UPPERCASE##` without `.md` is a built-in: `LANG`, `HEAD_LINKS` (canonical, hreflang alternates, og:url), `LANG_SWITCH` (one `<li>` per language for the globe menu, a `<details>` in the header). For a language other than English, content missing in `content/<lang>/` falls back to the same file or key in `content/en/` (`LANGUAGES[0]`); `renderPage` takes `fallback: { lang, blocks, strings }` and an `onFallback(list)` callback, and `renderLanguage` logs one `console.warn` per language. Anything else, content without a placeholder and a placeholder without content (in the language and in the English fallback) fail the build.
- Edit markers: `renderLanguage` calls `renderPage` with `markers: true` (default `false`), so dev and build output wrap editable content for the cmsfree editor: `##NAME.md##` becomes `<!--cms:NAME.md-->…<!--/cms-->`, `##NAME.md:items##` becomes `<!--cms:NAME.md:items-->…<!--/cms-->` (also for content from the English fallback), `##lower_key##` becomes `<!--cms:lower_key-->…<!--/cms-->` only in text context. A string gets no marker inside a tag (attribute value) or in the raw text of `<title>`, `<textarea>`, `<script>`, `<style>`; built-ins never get one. The key has no language. `www/index.html` ends with a small inline loader that adds `../cms.js` only when the URL has `?edit` or `localStorage["cmsfree:editor"]` is `"1"` (set by cms.js in a browser that has edited before), so visitors never download it; `www/public/cms.js` is the cmsfree editor, copied from the cmsfree repo's `dist/cms.js`. Do not edit it here.
- Output of `npm run build`: `dist/index.html` (language redirect: `de` if the browser ranks German above English, else `en`, also without JS), `dist/en/index.html`, `dist/de/index.html`, shared hashed `dist/assets/`, `sitemap.xml`, `robots.txt`.
- No server-side code and no PHP. No contact form: contact is WhatsApp and email links only.
- No backend, no cookies, no analytics. The privacy policy must say so; keep it accurate when adding anything that loads third-party content or collects data.
- Styling with Tailwind; site theme colors are primary `#4e6e54`, secondary `#d27d6b`, background `#f8f4e3`, text `#3d3d3d`; fonts Lato (body) and Playfair Display (headings), self-hosted.
- JS is vanilla only (menu toggle, active-section highlight). No jQuery or other runtime libraries.
- Layout changes go into `www/index.html` (both languages); text changes into `content/en/` and `content/de/`. Rendered Markdown has no classes; style it through the `.md-*` component classes (and `.legal` for the dialogs) in `site.css`.

## Commands

```
npm install
npm run dev        # Vite dev server on http://localhost:8000, www/ as root; / redirects, /en/ and /de/ are rendered per request
npm run build      # build www/ into dist/ (Vite, then render per language)
npm test           # build, then run tests/site.test.js and tests/content.test.js
node --test --test-name-pattern="resolves" tests/site.test.js   # single test (needs a build)
```

`vite.config.js` builds `www/index.html` only, runs Tailwind via `@tailwindcss/vite`, and uses `base: './'` so assets are referenced relatively. One plugin has two parts. Dev (`configureServer`, a middleware that runs before Vite's own): `/` serves the redirect page, `/en` and `/de` redirect (301) to the slash form, `/en/` and `/de/` render the template per request and pass it through `server.transformIndexHtml`, `/en/<rest>` is rewritten to `/<rest>` so relative asset URLs resolve to `www/`; a change in `content/` or the template sends a full reload. Build (`closeBundle`): reads the built `dist/index.html`, renders it per language, rewrites `./assets/` to `../assets/`, writes `dist/<lang>/index.html` and replaces `dist/index.html` with the redirect page; an error there fails the build.

## Structure

- `www/css/site.css`: Tailwind import, self-hosted `@font-face` rules, theme tokens (`primary`, `secondary`, `sand`, `ink`, `mist`, `font-sans`, `font-serif`), the `.legal` text styles, the `.legal-dialog` styles and the hero `.rise` animation. `@source` adds `scripts/`, which is outside the `www/` root.
- `www/js/main.js`: mobile menu (`data-menu-toggle` / `data-menu`), closing the language menu (`data-lang-menu`) on an outside click or Escape, `aria-current` on the menu link of the visible section, and the legal dialogs (links to `#<dialog id>` call `showModal()`, backdrop click closes, the hash is cleared on close, a dialog hash opens on load).
- `www/index.html`: the single page template (placeholders above).
- `content/<lang>/`: Markdown blocks and `site.yml` strings; `content/README.md` is the editor guide.
- `scripts/build-content.mjs`: the renderer (`renderLanguage`, `renderPage`, `LANGUAGES`, `CONTENT_DIR`) and the redirect page (`REDIRECT_HTML`); used only by `vite.config.js` and the tests.
- `www/images/`, `www/fonts/`: processed by Vite (hashed into `dist/assets/`). `www/public/` is copied as-is to the site root (`sitemap.xml`, `robots.txt`).
- All internal links and asset references are relative (never start with `/`), so the site works on `unfolding.pt` and under `cawoodm.github.io/site-unfolding.pt/`. `npm test` enforces this and checks that every reference resolves.

## Deployment

`.github/workflows/pages.yml` runs `npm ci` and `npm test`, then deploys `dist/` to GitHub Pages on every push to `main` that touches `content/`, `www/` (incl. images), `scripts/` or the build config (also runnable manually). It has a `build` job that uploads the Pages artifact and a separate `deploy` job; keep them split, because `deploy-pages` cannot find an artifact uploaded in the same job. Live preview: https://cawoodm.github.io/site-unfolding.pt/. The plan moves the domain `unfolding.pt` to GitHub Pages at the end (`www/public/CNAME` plus DNS change).

Commits use English messages and no AI attribution.
