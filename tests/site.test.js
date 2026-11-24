// Checks the built site in dist/. Run `npm test` (builds first).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const files = walk(DIST);
const html = files.filter((file) => extname(file) === '.html');
const css = files.filter((file) => extname(file) === '.css');

// Local references in href, src, srcset and url(); external, mailto:, tel: and # are skipped.
function localRefs(text) {
  const refs = [];
  for (const m of text.matchAll(/\b(?:href|src)="([^"]*)"/g)) refs.push(m[1]);
  for (const m of text.matchAll(/\bsrcset="([^"]*)"/g)) {
    for (const candidate of m[1].split(',')) refs.push(candidate.trim().split(/\s+/)[0]);
  }
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)/g)) refs.push(m[1]);
  return refs.filter((ref) => ref && !/^(?:[a-z]+:|\/\/|#)/i.test(ref));
}

// A reference resolves to a file, or to a folder that has an index.html.
function resolves(fromFile, ref) {
  const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
  const path = clean.startsWith('/') ? join(DIST, clean) : join(dirname(fromFile), clean);
  if (!existsSync(path)) return false;
  return statSync(path).isFile() || existsSync(join(path, 'index.html'));
}

test('all pages are built', () => {
  const pages = html.map((file) => relative(DIST, file).replaceAll('\\', '/')).sort();
  assert.deepEqual(pages, [
    'de/datenschutz/index.html',
    'de/impressum/index.html',
    'de/index.html',
    'en/index.html',
    'en/legal-notice/index.html',
    'en/privacy/index.html',
    'index.html',
  ]);
});

test('every local reference resolves', () => {
  const broken = [];
  for (const file of [...html, ...css]) {
    for (const ref of localRefs(readFileSync(file, 'utf8'))) {
      if (!resolves(file, ref)) broken.push(`${relative(DIST, file)} -> ${ref}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('no root-absolute references (site must work under a sub-path)', () => {
  const absolute = [];
  for (const file of [...html, ...css]) {
    for (const ref of localRefs(readFileSync(file, 'utf8'))) {
      if (ref.startsWith('/')) absolute.push(`${relative(DIST, file)} -> ${ref}`);
    }
  }
  assert.deepEqual(absolute, []);
});

// The home pages are generated and git-ignored, so Tailwind only sees the
// template's classes through @source in site.css.
test('built CSS includes utilities used only in templates/home.html', () => {
  const styles = css.map((file) => readFileSync(file, 'utf8')).join('\n');
  for (const selector of ['.min-h-\\[85vh\\]', '.md\\:grid-flow-col', '.md\\:grid-rows-5', '.aspect-square']) {
    assert.ok(styles.includes(selector), `missing ${selector}`);
  }
});

test('no Sitejet leftovers or third-party scripts', () => {
  for (const file of html) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /webcard|sitejet|api\.php|jquery/i, relative(DIST, file));
    for (const m of text.matchAll(/<script\b[^>]*\bsrc="([^"]*)"/g)) {
      assert.doesNotMatch(m[1], /^(?:https?:)?\/\//, `${relative(DIST, file)} loads ${m[1]}`);
    }
  }
});
