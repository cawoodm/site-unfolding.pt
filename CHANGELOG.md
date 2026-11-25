# Changelog

## 3.1.0 (2026-11-25)

### Fixed

- **No block fallback.** A block missing in German no longer shows the English block; the build fails and names the file. Strings still come from English when German lacks them (Hugo's `T`).
- cmsfree editor 3.1.0: blocks are looked up only in the page's language. It also brings the dialog keys (Esc, click outside, Ctrl+Enter) and the "no editable blocks" warning.
- **Relative URLs** (`relativeURLs = true`): the site works from the domain root and from the GitHub Pages preview subfolder.
- `package-lock.json` regenerated, so `npm ci` works in the deploy workflow.

## 3.0.0 (2026-11-24)

### Changed

- The site is a plain Hugo site: `layouts/home.html`, blocks in `content/<lang>/blocks/`, strings in `i18n/<lang>.yaml`, Tailwind through Hugo pipes. No Vite and no custom build script.
