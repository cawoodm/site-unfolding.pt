import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
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
  assert.equal(renderItems('### A\n\nOne\n\n### B\n\nTwo'), '<li><h3>A</h3>\n<p>One</p></li>\n<li><h3>B</h3>\n<p>Two</p></li>');
  const html = renderPage('<ol>##SERVICES:items##</ol>', { ...base, blocks: { services: '### A\n\nOne' } });
  assert.equal(html, '<ol><li><h3>A</h3>\n<p>One</p></li></ol>');
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

test('a key in both a .md file and site.yml fails the build', () => {
  assert.throws(() => renderPage('##HERO##', { ...base, blocks: { hero: 'x' }, strings: { hero: 'y' } }), /en: "hero" is both hero\.md and a site\.yml key/);
});

test('loadLanguage reads .md files and site.yml and rejects other files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'content-'));
  writeFileSync(join(dir, 'hero.md'), '# Hi');
  writeFileSync(join(dir, 'site.yml'), 'title: Unfolding Portugal | Algarve\nabout_role: Founder & Host\n');
  assert.deepEqual(loadLanguage(dir), { blocks: { hero: '# Hi' }, strings: { title: 'Unfolding Portugal | Algarve', about_role: 'Founder & Host' } });
  writeFileSync(join(dir, 'notes.txt'), 'x');
  assert.throws(() => loadLanguage(dir), /notes\.txt: only \.md files and site\.yml are allowed/);
});
