# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static website for **unfolding.pt** ("Unfolding Portugal", a personal retreat in the Algarve), hosted on GitHub Pages from `cawoodm/site-unfolding.pt`. It is a plain **Hugo** site (extended, 0.147.8) with Tailwind CSS and vanilla JS, without the Sitejet builder or its libraries and without a custom build script. The spec is `docs/CONCEPT.md`. Plans and working notes live locally in `tmp/plans/` (git-ignored).

The original Sitejet export is the content source and stays local in `old/` (git-ignored, not published).

## Target site

- Bilingual, single page per language: English and German (`/en/`, `/de/`; `/` is a language redirect). One template, `layouts/home.html`. Blocks are Markdown files in `content/<lang>/blocks/NAME.md` (no front matter); short strings are `key: text` lines in `i18n/<lang>.yaml`. `hugo.toml` has one `contentDir` per language, `defaultContentLanguageInSubdir = true` and a cascade (`/blocks/**`: `render = never`, `list = never`) so blocks are content, not pages. Legal notice (`LEGAL-NOTICE.md`) and privacy policy (`PRIVACY.md`) are `<dialog>`s at the end of the template, opened by the footer links `#legal-notice` / `#privacy`.
- Template calls: `{{ partial "cms-block.html" "NAME.md" }}`, `{{ partial "cms-items.html" "NAME.md" }}` (split at `### ` headings, one `<li><div>` each), `{{ partial "cms-text.html" "key" }}` (string with marker, text context), `{{ T "key" }}` (string without marker: attributes, `<title>`). The three `cms-*` partials in `layouts/_partials/` are shipped by cmsfree: keep them identical to the cmsfree versions. Blocks have no fallback: a block missing in German fails the build. A string missing in German comes from English (the default language, Hugo's `T`); a string missing everywhere fails the build (partials `errorf`).
- i18n keys must not be go-i18n reserved words (`description`, `other`, `one`, `two`, `few`, `many`, `zero`, `id`, `hash`, `translation`): the whole file is then read as one message and every `T` is empty. The meta description key is `meta_description`. `tests/site.test.js` checks this.
- Edit markers: the partials wrap editable output in `<!--cms:NAME.md-->...<!--/cms-->`, `<!--cms:NAME.md:items-->...`, `<!--cms:key-->...`. Strings via `T` get none. `layouts/home.html` ends with an inline loader that adds `/cms.js` only when the URL has `?edit` or `localStorage["cmsfree:editor"]` is `"1"`; `static/cms.js` is the cmsfree editor, copied from the cmsfree repo's `dist/cms.js`. Do not edit it here. Never run Hugo with `--minify` (strips markers) or `--quiet` (hides errors). Hugo strips HTML comments from templates (only `safeHTML` markers survive).
- `layouts/_markup/render-link.html` keeps `tel:` links; Hugo's built-in link hook turns them into `#ZgotmplZ`. Goldmark settings (`autoHeadingID = false`, typographer off, `unsafe = true`) are in `hugo.toml`.
- Built-ins: `layouts/home.html` builds `lang`, canonical/hreflang/og:url links and the language menu from `.AllTranslations`; `layouts/alias.html` is the root redirect (German if the browser ranks it above English; no JS: English).
- No server-side code and no PHP. No contact form: contact is WhatsApp and email links only.
- No backend, no cookies, no analytics. The privacy policy must say so; keep it accurate when adding anything that loads third-party content or collects data.
- Styling with Tailwind; site theme colors are primary `#4e6e54`, secondary `#d27d6b`, background `#f8f4e3`, text `#3d3d3d`; fonts Lato (body) and Playfair Display (headings), self-hosted.
- JS is vanilla only (menu toggle, active-section highlight). No jQuery or other runtime libraries.
- Layout changes go into `layouts/home.html` (both languages); text changes into `content/<lang>/blocks/` and `i18n/`. Rendered Markdown has no classes; style it through the `.md-*` component classes (and `.legal` for the dialogs) in `assets/css/site.css`.

## Commands

```
npm install
npm run dev        # hugo server on http://localhost:1313/
npm run build      # hugo: writes public/
npm test           # hugo, then node --test tests/site.test.js (needs hugo extended on PATH)
```

## Structure

- `assets/css/site.css`: Tailwind import (`@source "../../layouts"`), `@font-face` rules (`../fonts/` = `static/fonts/`), theme tokens, `.legal`, `.legal-dialog`, hero `.rise`, `.md-*` styles. Processed by `css.TailwindCSS` (needs npm `tailwindcss` + `@tailwindcss/cli`) and fingerprinted.
- `assets/js/main.js`: mobile menu, language menu, `aria-current` on the visible section, legal dialogs. `js.Build` + fingerprint.
- `static/`: `images/`, `fonts/`, `robots.txt`, `sitemap.xml` (static, Hugo's sitemap is disabled), `cms.js`. Copied as is.
- `relativeURLs = true` in `hugo.toml`: Hugo rewrites every local `href`/`src` to a page-relative path (`../css/…`, `../de/`), so the site works from the domain root and from a subfolder such as the preview `cawoodm.github.io/site-unfolding.pt/`. URLs inside scripts are not rewritten: the cms.js loader computes its own `../`. Canonical and `hreflang` stay absolute (`https://unfolding.pt/`). `npm test` checks that every reference resolves and none starts with `/`.

## Deployment

`.github/workflows/pages.yml` installs Hugo extended 0.147.8 and Node, runs `npm ci` and `npm test`, then deploys `public/` to GitHub Pages on every push to `main` that touches `content/`, `i18n/`, `layouts/`, `assets/`, `static/`, `hugo.toml`, `tests/` or package files (also runnable manually). It has a `build` job that uploads the Pages artifact and a separate `deploy` job; keep them split, because `deploy-pages` cannot find an artifact uploaded in the same job. The plan moves the domain `unfolding.pt` to GitHub Pages at the end (`static/CNAME` plus DNS change).

Commits use English messages and no AI attribution.
