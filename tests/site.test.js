// Checks the Hugo output in public/. Run `npm test` (builds first).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../public/', import.meta.url));

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
    'de/index.html',
    'en/index.html',
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

test('internal links are root-relative, so previews work on any host', () => {
  const absolute = [];
  for (const file of html) {
    for (const m of readFileSync(file, 'utf8').matchAll(/<(?:a|img|script|link)\b[^>]*\b(?:href|src)="(https:\/\/unfolding\.pt[^"]*)"[^>]*>/g)) {
      // Canonical and hreflang links are meant to be absolute.
      if (!/rel="(?:canonical|alternate)"/.test(m[0])) absolute.push(`${relative(DIST, file)} -> ${m[1]}`);
    }
  }
  assert.deepEqual(absolute, []);
});

test('built CSS includes utilities used only in the template and the dialog class', () => {
  const styles = css.map((file) => readFileSync(file, 'utf8')).join('\n');
  for (const selector of ['.min-h-\\[85vh\\]', '.md\\:grid-flow-col', '.md\\:grid-rows-5', '.aspect-square', '.legal-dialog', '.md-services']) {
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

test('each language page has the legal notice and privacy dialogs with content', () => {
  for (const lang of ['en', 'de']) {
    const text = readFileSync(join(DIST, lang, 'index.html'), 'utf8');
    for (const id of ['legal-notice', 'privacy']) {
      const m = text.match(new RegExp(`<dialog id="${id}"[^>]*>([\\s\\S]*?)</dialog>`));
      assert.ok(m, `${lang}: missing dialog #${id}`);
      assert.match(m[1].replace(/<[^>]*>/g, '').trim(), /(?:\w+\W+){5}/, `${lang}: dialog #${id} is empty`);
    }
  }
});

test('no placeholder or template code is left in any built page', () => {
  for (const file of html) assert.doesNotMatch(readFileSync(file, 'utf8'), /##[^#\s]+##|\{\{|\}\}/, relative(DIST, file));
});

test('blocks are content only: no page is rendered for them', () => {
  for (const dir of ['blocks', 'en/blocks', 'de/blocks']) assert.ok(!existsSync(join(DIST, dir)), dir);
});

test('every language page has the expected markers, language and hreflang links', () => {
  const blocks = ['HERO.md', 'WELCOME.md', 'JOURNEY.md', 'ABOUT.md', 'FOOTER-CONTACT.md', 'LEGAL-NOTICE.md', 'PRIVACY.md'];
  for (const lang of ['en', 'de']) {
    const text = readFileSync(join(DIST, lang, 'index.html'), 'utf8');
    assert.match(text, new RegExp(`<html lang="${lang}">`));
    for (const name of blocks) assert.match(text, new RegExp(`<!--cms:${name}-->[\\s\\S]+?<!--/cms-->`), `${lang}: ${name}`);
    assert.match(text, /<!--cms:SERVICES\.md:items--><li>/);
    assert.match(text, /<!--cms:menu_home-->[^<]+<!--\/cms-->/);
    assert.match(text, new RegExp(`<link rel="canonical" href="https://unfolding\\.pt/${lang}/">`));
    for (const l of ['en', 'de']) assert.match(text, new RegExp(`<link rel="alternate" hreflang="${l}" href="https://unfolding\\.pt/${l}/">`));
    // No marker inside attributes or <title>.
    assert.doesNotMatch(text, /(?:alt|aria-label|content)="[^"]*<!--cms/);
    assert.doesNotMatch(text, /<title>[^<]*<!--/);
  }
});

test('the languages differ and the language menu links to the other one', () => {
  const en = readFileSync(join(DIST, 'en', 'index.html'), 'utf8');
  const de = readFileSync(join(DIST, 'de', 'index.html'), 'utf8');
  assert.match(en, /<a href="\/de\/" hreflang="de" lang="de"[^>]*>Deutsch<\/a>/);
  assert.match(de, /<a href="\/en\/" hreflang="en" lang="en"[^>]*>English<\/a>/);
  assert.notEqual(en.match(/<title>[^<]*/)[0], de.match(/<title>[^<]*/)[0]);
});

test('the root page redirects by browser language and links both languages', () => {
  const text = readFileSync(join(DIST, 'index.html'), 'utf8');
  assert.match(text, /location\.replace/);
  assert.match(text, /<noscript><meta http-equiv="refresh" content="0; url=en\/"><\/noscript>/);
  for (const l of ['en', 'de', 'x-default']) assert.match(text, new RegExp(`hreflang="${l}"`));
});

test('robots.txt and sitemap.xml are published', () => {
  for (const name of ['robots.txt', 'sitemap.xml']) assert.ok(existsSync(join(DIST, name)), name);
});

test('language pages load the editor script on demand only', () => {
  const text = readFileSync(join(DIST, 'en', 'index.html'), 'utf8');
  // cms.js is loaded by the inline loader, never by a plain script tag.
  assert.match(text, /cms\.src = '\\?\/cms\.js'/);
  assert.doesNotMatch(text, /<script src="[^"]*cms\.js">/);
  assert.ok(existsSync(join(DIST, 'cms.js')), 'cms.js is published');
});

// go-i18n reads a whole i18n file as ONE message when it has a top-level key like "description" or "other";
// every T lookup then returns an empty string and Hugo only warns.
test('i18n files use no key reserved by go-i18n', () => {
  const reserved = new Set(['id', 'description', 'hash', 'leftdelim', 'rightdelim', 'zero', 'one', 'two', 'few', 'many', 'other', 'translation']);
  for (const lang of ['en', 'de']) {
    const keys = readFileSync(new URL(`../i18n/${lang}.yaml`, import.meta.url), 'utf8').split('\n').map((line) => line.match(/^([^\s#:][^:]*):/)?.[1]).filter(Boolean);
    assert.ok(keys.length > 10, `${lang}.yaml has keys`);
    assert.deepEqual(keys.filter((key) => reserved.has(key)), [], `${lang}.yaml`);
  }
});

test('every T string resolves: no empty title, attribute or marker', () => {
  for (const lang of ['en', 'de']) {
    const text = readFileSync(join(DIST, lang, 'index.html'), 'utf8');
    assert.doesNotMatch(text, /<title><\/title>/, `${lang}: empty title`);
    assert.doesNotMatch(text, /\b(?:content|aria-label)=""/, `${lang}: empty meta or aria-label`);
    assert.doesNotMatch(text, /<!--cms:([^>]+)--><!--\/cms-->/, `${lang}: empty marker`);
  }
});
