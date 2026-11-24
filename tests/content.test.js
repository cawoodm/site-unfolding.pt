import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadLanguage, renderItems, renderPage } from '../scripts/build-content.mjs';

const base = { lang: 'en', languages: ['en', 'de'], blocks: {}, strings: {} };

test('##KEY## inserts a Markdown block as HTML', () => {
  const html = renderPage('<div>##HERO##</div>', { ...base, blocks: { hero: '# unfolding\n\nA *gentle* start.' } });
  assert.equal(html, '<div><h1>unfolding</h1>\n<p>A <em>gentle</em> start.</p></div>');
});

test('an underscore in the placeholder matches a hyphen in the file name', () => {
  const html = renderPage('##FOOTER_CONTACT##', { ...base, blocks: { 'footer-contact': 'Guia' } });
  assert.equal(html, '<p>Guia</p>');
});

test('##KEY## inserts an escaped site.yml string', () => {
  const html = renderPage('<p title="##ABOUT_ROLE##">##ABOUT_ROLE##</p>', { ...base, strings: { about_role: 'Founder & "Host"' } });
  assert.equal(html, '<p title="Founder &amp; &quot;Host&quot;">Founder &amp; &quot;Host&quot;</p>');
});

test('##KEY:items## renders one <li> per ### section', () => {
  assert.equal(renderItems('### A\n\nOne\n\n### B\n\nTwo'), '<li><div><h3>A</h3>\n<p>One</p></div></li>\n<li><div><h3>B</h3>\n<p>Two</p></div></li>');
  const html = renderPage('<ol>##SERVICES:items##</ol>', { ...base, blocks: { services: '### A\n\nOne' } });
  assert.equal(html, '<ol><li><div><h3>A</h3>\n<p>One</p></div></li></ol>');
});

test('##KEY:items## keeps several paragraphs in one item', () => {
  assert.equal(renderItems('### A\n\nOne\n\nTwo'), '<li><div><h3>A</h3>\n<p>One</p>\n<p>Two</p></div></li>');
});

test('##KEY:items## fails on text before the first ### heading', () => {
  assert.throws(() => renderItems('Intro\n\n### A\n\nOne'), /must start with a "### " heading/);
});

test('built-ins: LANG, CANONICAL, ALTERNATES, LANG_SWITCH', () => {
  const html = renderPage('##LANG##|##CANONICAL##|##ALTERNATES##|##LANG_SWITCH##', { ...base, lang: 'de' });
  assert.equal(html, [
    'de',
    'https://unfolding.pt/de/',
    '<link rel="alternate" hreflang="en" href="https://unfolding.pt/en/">\n  <link rel="alternate" hreflang="de" href="https://unfolding.pt/de/">',
    '<a href="../en/" hreflang="en" lang="en" class="hover:underline">EN</a><span aria-hidden="true">|</span><span aria-current="true" class="font-bold">DE</span>',
  ].join('|'));
});

test('a placeholder without content fails the build', () => {
  assert.throws(() => renderPage('##MISSING##', base), /en: no content for placeholder ##MISSING##/);
});

test('content the template does not use fails the build', () => {
  assert.throws(() => renderPage('##HERO##', { ...base, blocks: { hero: 'x', extra: 'y' } }), /en: content not used by the template: extra/);
});

test('a site.yml string the template does not use fails the build', () => {
  assert.throws(() => renderPage('##HERO##', { ...base, blocks: { hero: 'x' }, strings: { extra: 'y' } }), /en: content not used by the template: extra/);
});

test('a site.yml string the template does not use fails the build', () => {
  assert.throws(() => renderPage('##HERO##', { ...base, blocks: { hero: 'x' }, strings: { extra: 'y' } }), /en: content not used by the template: extra/);
});

test('a key in both a .md file and site.yml fails the build', () => {
  assert.throws(() => renderPage('##HERO##', { ...base, blocks: { hero: 'x' }, strings: { hero: 'y' } }), /en: "hero" is both hero\.md and a site\.yml key/);
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
  withDir({ 'hero.md': '# Hi', 'site.yml': 'title: Unfolding Portugal | Algarve\nabout_role: Founder & Host\n' }, (dir) => {
    assert.deepEqual(loadLanguage(dir), { blocks: { hero: '# Hi' }, strings: { title: 'Unfolding Portugal | Algarve', about_role: 'Founder & Host' } });
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
