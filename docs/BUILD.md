# Build

The site is a plain [Hugo](https://gohugo.io) site (extended edition, 0.147.8): one page template, one content folder per language, no custom build script. Tailwind runs through Hugo (`css.TailwindCSS`).

| Input | Role |
|---|---|
| `hugo.toml` | Languages (`en`, `de`), `baseURL`, Goldmark settings, cascade that keeps blocks from rendering as pages |
| `layouts/home.html` | The single page template (was `www/index.html`) |
| `layouts/alias.html` | The root redirect page (`/` goes to `en/` or `de/` by browser language) |
| `layouts/_partials/cms-*.html` | Partials that output blocks, `:items` lists and strings with the cmsfree edit markers. Shipped by cmsfree; do not edit |
| `layouts/_markup/render-link.html` | Link render hook: keeps `tel:` links (Hugo's built-in hook turns them into `#ZgotmplZ`) |
| `content/<lang>/blocks/*.md` | Markdown blocks (`HERO.md`, `WELCOME.md`, ...), no front matter |
| `i18n/<lang>.yaml` | Short strings, one `key: text` line each. German falls back to English per key |
| `assets/css/site.css` | Tailwind v4 entry point, fonts, theme, styles for rendered Markdown |
| `assets/js/main.js` | Menu, active section, legal dialogs |
| `static/` | Copied as is: `images/`, `fonts/`, `robots.txt`, `sitemap.xml`, `cms.js` (the cmsfree editor, copied from the cmsfree repo; do not edit here) |

## Commands

```
npm install
npm run dev     # hugo server on http://localhost:1313/ (/ redirects, /en/ and /de/)
npm run build   # hugo: writes public/
npm test        # hugo, then node --test tests/site.test.js
```

Use `hugo` without `--quiet` (it hides errors) and without `--minify` (it strips the edit markers). Hugo, `tailwindcss` and `@tailwindcss/cli` must be installed (`npm install` gets the last two).

## Template

| In `layouts/home.html` | Output |
|---|---|
| `{{ partial "cms-block.html" "WELCOME.md" }}` | `content/<lang>/blocks/WELCOME.md` as HTML, wrapped in `<!--cms:WELCOME.md-->...<!--/cms-->` |
| `{{ partial "cms-items.html" "SERVICES.md" }}` | the file split at `### ` headings, one `<li><div>...</div></li>` each |
| `{{ partial "cms-text.html" "menu_home" }}` | the string `menu_home` from `i18n/<lang>.yaml`, wrapped in a marker (text context only) |
| `{{ T "title" }}` | the same string without a marker (attributes, `<title>`) |

Blocks have no fallback: a block missing in a language fails the build and names the file, e.g. `content/de/blocks/HERO.md`. A string missing in a language comes from the default language (English), because Hugo's `T` does that. A string missing everywhere fails the build (the partials call `errorf`; `T` in attributes only warns, which `npm test` catches).

i18n keys must not be `description`, `other`, `one`, `two`, `few`, `many`, `zero`, `id`, `hash`, `translation`: go-i18n then reads the whole file as one message and every lookup is empty. That is why the meta description key is `meta_description`.

Assets: CSS and JS go through Hugo pipes (`css.TailwindCSS`, `js.Build`, `fingerprint`), images and fonts are static. With `relativeURLs = true`, all local links and assets are page-relative (e.g. `../de/`), so the site works from the root or a subfolder; canonical and `hreflang` links use `.Permalink` (`https://unfolding.pt/...`). The editor loader adds `../cms.js` only with `?edit` or in a browser that has edited before.

## Output

```
public/
  index.html        language redirect
  en/index.html     English page (legal notice + privacy as dialogs)
  de/index.html     German page (Impressum + Datenschutz as dialogs)
  css/site.<hash>.css, js/main.<hash>.js
  images/, fonts/, cms.js, robots.txt, sitemap.xml
```

## Tests and deployment

`npm test` builds, then `tests/site.test.js` checks `public/`: exactly three pages, every local reference resolves, Tailwind generated the template's utilities, both dialogs have content, no placeholder or template code is left, edit markers for every block in both languages, `hreflang` links, no empty translated string, the root redirect, no third-party scripts, the cms.js loader.

`.github/workflows/pages.yml` runs on pushes to `main` that touch `content/`, `i18n/`, `layouts/`, `assets/`, `static/`, `hugo.toml`, `tests/`, `package*.json` or the workflow. The `build` job installs Hugo extended 0.147.8 and Node, runs `npm ci` and `npm test`, and uploads `public/`; a separate `deploy` job publishes it. If a test fails, nothing is deployed.
