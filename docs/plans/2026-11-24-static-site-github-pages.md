# Static unfolding.pt on GitHub Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the unfolding.pt website as a pure static site from `www/`, published to GitHub Pages from the new repo `cawoodm/site-unfolding.pt`.

**Architecture:** `www/` is a copy of the Sitejet export in `old/` without the PHP files (`api.php`, `index.php`). The Sitejet runtime keeps working because no page uses a Sitejet form or collection, so the API proxy is not needed. Contact stays as it is today: WhatsApp and email links, no form. A Node test file checks that every local reference resolves. A GitHub Actions workflow runs the tests and deploys `www/` to Pages on every push to `main`.

**Tech Stack:** Static HTML/CSS/JS (Sitejet export, jQuery runtime), Vite 7 (local dev server only), Node 22 `node:test` (no test dependencies), GitHub Actions + GitHub Pages.

## Global Constraints

- New site lives in `www/` and needs no PHP or other server-side processing.
- Same content, layout and styles as the current site in `old/`.
- All links, images and resources in `www/` must resolve.
- Repo: `cawoodm/site-unfolding.pt` on GitHub, public (Pages on a private repo needs a paid plan).
- GitHub Action publishes to GitHub Pages when `main` is pushed.
- No contact form. Contact stays as WhatsApp and email links.
- The Sitejet runtime hard-codes root-absolute paths (`o.p="/webcard/static/"`, `/webcard/vendor/slick/...`). The site only works at a domain root, so the final host is the custom domain `unfolding.pt`, not `cawoodm.github.io/site-unfolding.pt/`.
- Code, identifiers and commit messages in English. No AI attribution or trailers in commits.
- `old/` stays on disk as a reference but is not committed.

## Prerequisites (Marc)

- Access to the DNS settings of `unfolding.pt` (needed only for Task 4).

## File Structure

| Path | Responsibility |
|---|---|
| `www/` | The published site (copy of `old/` minus PHP). |
| `www/CNAME` | Custom domain for GitHub Pages (Task 4). |
| `tests/site.test.js` | Reference checker and PHP check. |
| `.github/workflows/pages.yml` | Test and deploy `www/` to GitHub Pages on push to `main`. |
| `vite.config.js` | Local dev server with `www/` as root. |
| `package.json` | `dev` and `test` scripts. |
| `.gitignore` | Ignores `node_modules/` and `old/`. |
| `CLAUDE.md` | Repo guidance, updated for `www/`. |

---

### Task 1: Repo scaffolding and reference checks

**Files:**
- Create: `.gitignore`
- Create: `tests/site.test.js`
- Modify: `package.json`
- Modify: `vite.config.js`
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: `npm test` runs `node --test tests/site.test.js`. `npm run dev` serves `www/` on http://localhost:8000. Helpers in `tests/site.test.js`: `WWW` (absolute path of `www/` with trailing separator), `walk(dir): string[]`, `filesWith(ext): string[]`, `rootRefs(text): string[]`, `resolves(ref): boolean`.
- [ ] **Step 1: Initialise git**

```bash
cd /c/projects/Marc/unfolding.pt
git init -b main
```

Expected: `Initialized empty Git repository in .../unfolding.pt/.git/`

- [ ] **Step 2: Write `.gitignore`**

```gitignore
node_modules/
old/
```

- [ ] **Step 3: Write the failing tests in `tests/site.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WWW = fileURLToPath(new URL('../www/', import.meta.url));

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function filesWith(ext) {
  return walk(WWW).filter((file) => extname(file) === ext);
}

// Root-absolute references ("/images/..."), ignoring protocol-relative "//host".
function rootRefs(text) {
  const refs = [];
  for (const m of text.matchAll(/\b(?:href|src|data-src)="(\/(?!\/)[^"]*)"/g)) refs.push(m[1]);
  for (const m of text.matchAll(/url\((?:&quot;|["'])?(\/(?!\/)[^"'&)]+)/g)) refs.push(m[1]);
  for (const m of text.matchAll(/\bsrcset="([^"]*)"/g)) {
    for (const candidate of m[1].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url.startsWith('/') && !url.startsWith('//')) refs.push(url);
    }
  }
  return refs;
}

// A reference resolves to a file, or to a folder that has an index.html.
function resolves(ref) {
  const path = join(WWW, decodeURIComponent(ref.split(/[?#]/)[0]));
  if (!existsSync(path)) return false;
  return statSync(path).isFile() || existsSync(join(path, 'index.html'));
}

test('www/ exists and has no PHP files', () => {
  assert.ok(existsSync(WWW), 'www/ is missing');
  assert.deepEqual(filesWith('.php'), []);
});

test('no page references the PHP API proxy', () => {
  const offenders = filesWith('.html').filter((file) => readFileSync(file, 'utf8').includes('api.php'));
  assert.deepEqual(offenders, []);
});

test('every root-absolute reference in HTML and CSS resolves', () => {
  const broken = [];
  for (const file of [...filesWith('.html'), ...filesWith('.css')]) {
    for (const ref of rootRefs(readFileSync(file, 'utf8'))) {
      if (!resolves(ref)) broken.push(`${file.slice(WWW.length)} -> ${ref}`);
    }
  }
  assert.deepEqual(broken, []);
});
```

Note: the privacy pages embed an external Matomo opt-out iframe from `www.page-stats.de/index.php`. That is an external URL, so the PHP test only looks for `api.php`.

- [ ] **Step 4: Replace `package.json`**

```json
{
  "name": "site-unfolding-pt",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "test": "node --test tests/site.test.js"
  },
  "devDependencies": {
    "vite": "^7.0.0"
  }
}
```

- [ ] **Step 5: Point Vite at `www/`**

In `vite.config.js`, change the root line:

```js
const root = resolve(import.meta.dirname, 'old');
```

to:

```js
const root = resolve(import.meta.dirname, 'www');
```

And change the comment `// Serve the static Sitejet export in old/ as the site root.` to `// Serve the static site in www/ as the site root.`

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL. The first test reports `www/ is missing`, the others fail with `ENOENT ... www`.

- [ ] **Step 7: Replace `CLAUDE.md`**

````markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static website for **unfolding.pt** ("Unfolding Portugal", a personal retreat in the Algarve). It was exported from the Sitejet website builder and is now hosted on GitHub Pages from `cawoodm/site-unfolding.pt`. The published site is `www/`. `old/` (local only, git-ignored) is the original export with its PHP files, kept for reference.

Content is bilingual: English (`www/en/`) and German (`www/de/`). Each page is a generated `index.html` in its own folder. `www/index.html` is a language chooser that goes to `/en/` after 10 s.

## Commands

```
npm install
npm run dev        # Vite on http://localhost:8000, www/ as site root
npm test           # node:test checks in tests/site.test.js
node --test --test-name-pattern="resolves" tests/site.test.js   # single test
```

`vite.config.js` sets `appType: 'mpa'` (no SPA fallback) and redirects folder URLs without a trailing slash (`/en` to `/en/`), like GitHub Pages does.

## Deployment

`.github/workflows/pages.yml` runs `npm test` and deploys `www/` to GitHub Pages on every push to `main`. `www/CNAME` sets the custom domain. The Sitejet runtime hard-codes root-absolute paths (`/webcard/static/`), so the site only works at a domain root, not at `cawoodm.github.io/site-unfolding.pt/`.

## Architecture

- `www/webcard/` is the Sitejet runtime (minified vendor code). Do not edit it.
- `www/css/custom.*.css` and `www/js/custom.*.js` are the site-level styles and menu JS. The numeric suffix is a cache-busting timestamp referenced from every page.
- `www/images/<size>/<id>/<name>` holds responsive image variants. Pages pick variants with inline `@media` rules and `srcset`.
- `webcard.apiHost` is not set, because there is no API proxy. Do not add Sitejet forms or collections; they need that proxy.

## Editing pages

- HTML is generated and minified. Page styles sit in an inline `<style>` block keyed by element IDs like `#ed-4042029659`. Keep IDs and class names intact.
- EN and DE pages are separate copies. Apply content changes to both.
- Every root-absolute reference must resolve inside `www/`. `npm test` checks this.
````

- [ ] **Step 8: Commit**

```bash
git add .gitignore package.json package-lock.json vite.config.js tests/site.test.js CLAUDE.md CONCEPT.md docs/
git commit -m "chore: scaffold static site repo with reference checks"
```

---

### Task 2: Static copy of the site in `www/`

**Files:**
- Create: `www/` (copied from `old/`)
- Modify: all `www/**/index.html` with `webcard.apiHost` (7 pages)
- Modify: `www/en/index.html` (footer legal links)

**Interfaces:**
- Consumes: `npm test` and `npm run dev` from Task 1.
- Produces: `www/` with all pages, served by `npm run dev` and checked by `npm test`.

- [ ] **Step 1: Copy the export and drop the PHP files**

```bash
cd /c/projects/Marc/unfolding.pt
cp -r old www
rm www/api.php www/index.php
```

- [ ] **Step 2: Remove the API proxy host from every page**

```bash
sed -i "s#webcard.apiHost=location.host + '/api.php';##" $(grep -rl "webcard.apiHost" www --include=index.html)
grep -rc "api.php" www --include=*.html | grep -v ':0$'
```

Expected: the `grep` prints nothing.

- [ ] **Step 3: Fix the broken footer links on the English home page**

```bash
sed -i 's#href="/legal-notice"#href="/en/legal-notice"#; s#href="/privacy"#href="/en/privacy"#' www/en/index.html
grep -o 'href="/en/\(legal-notice\|privacy\)"' www/en/index.html
```

Expected:

```
href="/en/legal-notice"
href="/en/privacy"
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 3 tests, 0 failures. (A dry run of the checker on `old/` found 119 references, and only `/legal-notice` and `/privacy` were broken.)

- [ ] **Step 5: Smoke-test in the browser**

Run: `npm run dev`, then open each URL and check that it looks like the current live site and that the DevTools console shows no errors and no request to `api.php`:

- http://localhost:8000/ (language chooser, goes to `/en/` after 10 s)
- http://localhost:8000/en/ and http://localhost:8000/de/ (hero image, menu, slider, lazy-loaded images, smooth scroll to Contact)
- http://localhost:8000/en/privacy/, /en/legal-notice/, /en/subpage/, /de/datenschutz/, /de/impressum/
- Footer links "Legal Notice" and "Privacy Policy" on `/en/` open the English legal pages.

Stop the server when done.

- [ ] **Step 6: Commit**

```bash
git add www
git commit -m "feat: add static copy of the site without PHP"
```

---

### Task 3: GitHub repo and Pages workflow

**Files:**
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: `npm test` from Task 1; `www/` from Task 2.
- Produces: repo `cawoodm/site-unfolding.pt` with Pages source "GitHub Actions"; workflow `pages.yml`.

- [ ] **Step 1: Write `.github/workflows/pages.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm test
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: www
      - id: deployment
        uses: actions/deploy-pages@v4
```

`npm test` needs no `npm ci`; the tests use only Node built-ins. If a newer major version of an action exists, use it.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/pages.yml
git commit -m "ci: deploy www/ to GitHub Pages on push to main"
```

- [ ] **Step 3: Create the repo and enable Pages before the first push**

Confirm with Marc before running: this creates a public repo.

```bash
gh repo create cawoodm/site-unfolding.pt --public --source . --remote origin --description "unfolding.pt static website"
gh api -X POST repos/cawoodm/site-unfolding.pt/pages -f build_type=workflow
```

Expected: the second command returns JSON with `"build_type": "workflow"`.

- [ ] **Step 4: Push and watch the deploy**

```bash
git push -u origin main
gh run watch --exit-status $(gh run list --repo cawoodm/site-unfolding.pt --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: the run ends with `✓` for the `deploy` job.

- [ ] **Step 5: Check the deployment**

```bash
curl -sL -o /dev/null -w "%{http_code}\n" https://cawoodm.github.io/site-unfolding.pt/en/
```

Expected: `200`. Styles and images are broken at this URL because of the root-absolute paths; that is expected until Task 4.

---

### Task 4: Custom domain `unfolding.pt`

Do this only when Marc is ready to move the live domain away from Sitejet. Until DNS changes, the live site stays on Sitejet.

**Files:**
- Create: `www/CNAME`

**Interfaces:**
- Consumes: Pages site from Task 3.

- [ ] **Step 1: Marc updates DNS at the registrar of unfolding.pt**

Keep any existing MX and TXT records. Replace the apex and `www` records with:

| Name | Type | Value |
|---|---|---|
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |
| `@` | AAAA | `2606:50c0:8000::153` |
| `@` | AAAA | `2606:50c0:8001::153` |
| `@` | AAAA | `2606:50c0:8002::153` |
| `@` | AAAA | `2606:50c0:8003::153` |
| `www` | CNAME | `cawoodm.github.io` |

- [ ] **Step 2: Add the CNAME file and set the custom domain**

```bash
printf 'unfolding.pt\n' > www/CNAME
git add www/CNAME
git commit -m "chore: serve the site on unfolding.pt"
git push
gh api -X PUT repos/cawoodm/site-unfolding.pt/pages -f cname=unfolding.pt
```

- [ ] **Step 3: Enforce HTTPS once the certificate exists**

Check until `"https_certificate"` shows `"state": "approved"` (can take up to an hour after DNS propagates):

```bash
gh api repos/cawoodm/site-unfolding.pt/pages --jq '.https_certificate.state'
```

Then:

```bash
gh api -X PUT repos/cawoodm/site-unfolding.pt/pages -F https_enforced=true
```

- [ ] **Step 4: Verify the live site**

```bash
curl -sI https://unfolding.pt/en/ | head -1
curl -sI https://unfolding.pt/en | grep -i '^location'
curl -sI https://unfolding.pt/webcard/static/app.bundle.1794403456.js | head -1
```

Expected: `HTTP/2 200`, then `location: https://unfolding.pt/en/`, then `HTTP/2 200`.

In the browser, repeat the Task 2 smoke test on https://unfolding.pt. After that, Marc can cancel the Sitejet hosting.
