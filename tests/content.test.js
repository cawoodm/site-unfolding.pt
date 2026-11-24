import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadLanguage, renderItems, renderPage } from '../scripts/build-content.mjs';

const base = { lang: 'en', languages: ['en', 'de'], blocks: {}, strings: {} };

test('##NAME.md## inserts the Markdown file as HTML', () => {
  const html = renderPage('<div>##HERO.md##</div>', { ...base, blocks: { 'HERO.md': '# unfolding\n\nA *gentle* start.' } });
  assert.equal(html, '<div><h1>unfolding</h1>\n<p>A <em>gentle</em> start.</p></div>');
});

test('the .md placeholder maps to the exact file name, with hyphens and case', () => {
  assert.equal(renderPage('##FOOTER-CONTACT.md##', { ...base, blocks: { 'FOOTER-CONTACT.md': 'Guia' } }), '<p>Guia</p>');
  assert.equal(renderPage('##WELCOME.md##', { ...base, blocks: { 'WELCOME.md': 'Hi' } }), '<p>Hi</p>');
});

test('a .md placeholder with a different case than the file fails the build', () => {
  assert.throws(() => renderPage('##welcome.md##', { ...base, blocks: { 'WELCOME.md': 'Hi' } }), /en: no content for placeholder ##welcome\.md## \(expected file content\/en\/welcome\.md/);
  assert.throws(() => renderPage('##WELCOME.MD##', { ...base, blocks: { 'WELCOME.md': 'Hi' } }), /unknown placeholder ##WELCOME\.MD##/);
});

test('##lowercase_key## inserts an escaped site.yml string', () => {
  const html = renderPage('<p title="##about_role##">##about_role##</p>', { ...base, strings: { about_role: 'Founder & "Host"' } });
  assert.equal(html, '<p title="Founder &amp; &quot;Host&quot;">Founder &amp; &quot;Host&quot;</p>');
});

test('a lowercase placeholder without a site.yml key fails the build', () => {
  assert.throws(() => renderPage('##missing_key##', base), /en: no content for placeholder ##missing_key## \(expected key "missing_key" in content\/en\/site\.yml\)/);
});

test('##NAME.md:items## renders one <li> per ### section', () => {
  assert.equal(renderItems('### A\n\nOne\n\n### B\n\nTwo'), '<li><div><h3>A</h3>\n<p>One</p></div></li>\n<li><div><h3>B</h3>\n<p>Two</p></div></li>');
  const html = renderPage('<ol>##SERVICES.md:items##</ol>', { ...base, blocks: { 'SERVICES.md': '### A\n\nOne' } });
  assert.equal(html, '<ol><li><div><h3>A</h3>\n<p>One</p></div></li></ol>');
});

test('##NAME.md:items## keeps several paragraphs in one item', () => {
  assert.equal(renderItems('### A\n\nOne\n\nTwo'), '<li><div><h3>A</h3>\n<p>One</p>\n<p>Two</p></div></li>');
});

test('##NAME.md:items## fails on text before the first ### heading', () => {
  assert.throws(() => renderItems('Intro\n\n### A\n\nOne'), /must start with a "### " heading/);
  assert.throws(() => renderPage('##S.md:items##', { ...base, blocks: { 'S.md': 'Intro' } }), /must start with a "### " heading/);
});

test(':items is only allowed on a .md placeholder', () => {
  assert.throws(() => renderPage('##title:items##', { ...base, strings: { title: 'x' } }), /only allowed on a \.md placeholder/);
});

test('built-ins: LANG, HEAD_LINKS, LANG_SWITCH', () => {
  const html = renderPage('##LANG##|##HEAD_LINKS##|##LANG_SWITCH##', { ...base, lang: 'de' });
  assert.equal(html, [
    'de',
    [
      '<link rel="canonical" href="https://unfolding.pt/de/">',
      '<link rel="alternate" hreflang="en" href="https://unfolding.pt/en/">',
      '<link rel="alternate" hreflang="de" href="https://unfolding.pt/de/">',
      '<meta property="og:url" content="https://unfolding.pt/de/">',
    ].join('\n  '),
    '<a href="../en/" hreflang="en" lang="en" class="hover:underline">EN</a><span aria-hidden="true">|</span><span aria-current="true" class="font-bold">DE</span>',
  ].join('|'));
});

test('an unknown uppercase or mixed-case placeholder fails the build', () => {
  assert.throws(() => renderPage('##UNKNOWN##', base), /en: unknown placeholder ##UNKNOWN##/);
  assert.throws(() => renderPage('##Welcome##', base), /en: unknown placeholder ##Welcome##/);
});

test('content the template does not use fails the build', () => {
  assert.throws(() => renderPage('##HERO.md##', { ...base, blocks: { 'HERO.md': 'x', 'EXTRA.md': 'y' } }), /en: content not used by the template: EXTRA\.md/);
});

test('a site.yml string the template does not use fails the build', () => {
  assert.throws(() => renderPage('##HERO.md##', { ...base, blocks: { 'HERO.md': 'x' }, strings: { extra: 'y' } }), /en: content not used by the template: extra/);
});

function withDir(files, check) {
  const dir = mkdtempSync(join(tmpdir(), 'content-'));
  try {
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    check(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('loadLanguage reads .md files and site.yml and rejects other files', () => {
  withDir({ 'HERO.md': '# Hi', 'site.yml': 'title: Unfolding Portugal | Algarve\nabout_role: Founder & Host\n' }, (dir) => {
    assert.deepEqual(loadLanguage(dir), { blocks: { 'HERO.md': '# Hi' }, strings: { title: 'Unfolding Portugal | Algarve', about_role: 'Founder & Host' } });
    writeFileSync(join(dir, 'notes.txt'), 'x');
    assert.throws(() => loadLanguage(dir), /notes\.txt: only \.md files and site\.yml are allowed/);
  });
});

test('site.yml must be a list of key: text lines', () => {
  withDir({ 'site.yml': 'just some text\n' }, (dir) => {
    assert.throws(() => loadLanguage(dir), /site\.yml: must be a list of "key: text" lines/);
  });
});

test('a site.yml value must be non-empty text', () => {
  withDir({ 'site.yml': 'title:\n' }, (dir) => {
    assert.throws(() => loadLanguage(dir), /"title" must be text; put it in double quotes/);
  });
  withDir({ 'site.yml': 'title: 2024\n' }, (dir) => {
    assert.throws(() => loadLanguage(dir), /"title" must be text; put it in double quotes/);
  });
});

test('a site.yml key must be lowercase letters, digits and underscores', () => {
  withDir({ 'site.yml': 'Title: x\n' }, (dir) => {
    assert.throws(() => loadLanguage(dir), /key "Title" must be lowercase/);
  });
  withDir({ 'site.yml': 'menu-home: x\n' }, (dir) => {
    assert.throws(() => loadLanguage(dir), /key "menu-home" must be lowercase/);
  });
});

const fallback = { lang: 'en', blocks: { 'ABOUT.md': 'English *about*', 'SERVICES.md': '### A\n\nOne' }, strings: { pagetitle: 'Fish & Chips' } };
const de = { ...base, lang: 'de' };

test('a missing key falls back to the escaped English string', () => {
  assert.equal(renderPage('##pagetitle##', { ...de, fallback }), 'Fish &amp; Chips');
});

test('a missing .md file falls back to the English block, also with :items', () => {
  assert.equal(renderPage('##ABOUT.md##', { ...de, fallback }), '<p>English <em>about</em></p>');
  assert.equal(renderPage('<ol>##SERVICES.md:items##</ol>', { ...de, fallback }), '<ol><li><div><h3>A</h3>\n<p>One</p></div></li></ol>');
});

test('German content wins over the English fallback', () => {
  assert.equal(renderPage('##pagetitle##', { ...de, strings: { pagetitle: 'Titel' }, fallback }), 'Titel');
});

test('content missing in the language and in English names both folders', () => {
  assert.throws(() => renderPage('##nope##', { ...de, fallback }), /de: no content for placeholder ##nope## \(expected key "nope" in content\/de\/site\.yml and content\/en\/site\.yml\)/);
  assert.throws(() => renderPage('##NOPE.md##', { ...de, fallback }), /de: no content for placeholder ##NOPE\.md## \(expected file content\/de\/NOPE\.md and content\/en\/NOPE\.md;/);
});

test('English has no fallback: missing content still fails', () => {
  assert.throws(() => renderPage('##pagetitle##', base), /en: no content for placeholder ##pagetitle## \(expected key "pagetitle" in content\/en\/site\.yml\)/);
});

test('every fallback is reported through onFallback', () => {
  let reported;
  renderPage('##pagetitle## ##ABOUT.md##', { ...de, fallback, onFallback: (list) => { reported = list; } });
  assert.deepEqual(reported, ['##pagetitle##', '##ABOUT.md##']);
  reported = undefined;
  renderPage('x', { ...de, fallback, onFallback: (list) => { reported = list; } });
  assert.deepEqual(reported, []);
});

test('the unused-content check stays per language and ignores fallback content', () => {
  assert.throws(() => renderPage('##pagetitle##', { ...de, blocks: { 'EXTRA.md': 'y' }, fallback }), /de: content not used by the template: EXTRA\.md/);
  assert.throws(() => renderPage('##pagetitle##', { ...de, strings: { extra: 'y' }, fallback }), /de: content not used by the template: extra/);
  assert.equal(renderPage('##pagetitle##', { ...de, fallback }), 'Fish &amp; Chips');
});
